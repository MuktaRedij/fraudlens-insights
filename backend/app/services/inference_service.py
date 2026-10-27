"""Process-wide adapter around the frozen, stateful fraud_model_v1 package.

The production feature engineer keeps behavioral history in memory. This academic
service intentionally uses one engine per process and serializes calls. A production
multi-worker deployment needs centralized state, transaction ordering, and
concurrency control (TODO: design and implement those before scaling workers).
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import logging
import os
import sys
import threading
from pathlib import Path
from types import ModuleType
from typing import Any, Mapping

logger = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPOSITORY_ROOT = BACKEND_ROOT.parent
DEFAULT_DEPLOYMENT_DIR = BACKEND_ROOT / "ml" / "deployment" / "fraud_model_v1"
INFERENCE_MODULE_PATH = BACKEND_ROOT / "ml" / "deployment" / "inference" / "integrated_inference.py"
REQUIRED_CHECKSUM_FILES = {
    "E7_raw_vs_calibrated_comparison.csv",
    "README.md",
    "calibration/platt_calibrator.joblib",
    "calibration_config.json",
    "feature_schema.json",
    "feature_schema_normalized.json",
    "model/lightgbm_behavioral.txt",
    "model_config.json",
    "model_metadata.json",
    "model_metadata.json.pre_freeze_backup",
    "threshold_config.json",
}


class InferenceUnavailableError(RuntimeError):
    """The frozen deployment could not be initialized in this process."""


class DeploymentIntegrityError(InferenceUnavailableError):
    """A frozen deployment file is absent, unreadable, or has the wrong hash."""


class InferenceService:
    """Own exactly one frozen inference engine for the process lifetime."""

    def __init__(self, deployment_dir: str | Path | None = None) -> None:
        configured_path = deployment_dir or os.getenv("FRAUD_DEPLOYMENT_DIR")
        if configured_path is None:
            resolved_path = DEFAULT_DEPLOYMENT_DIR
        else:
            resolved_path = Path(configured_path).expanduser()
            if not resolved_path.is_absolute():
                resolved_path = REPOSITORY_ROOT / resolved_path
        self.deployment_dir = resolved_path.resolve()
        self._engine: Any | None = None
        self._initialization_attempted = False
        self._initialization_error: Exception | None = None
        self._initialization_lock = threading.Lock()
        self._prediction_lock = threading.Lock()
        self._metadata: dict[str, Any] | None = None
        self._manifest: dict[str, Any] | None = None
        self._calibration_config: dict[str, Any] | None = None
        self._integrity_verified = False

    @property
    def initialized(self) -> bool:
        return self.ready

    @property
    def ready(self) -> bool:
        engine = self._engine
        return bool(
            self._integrity_verified
            and engine is not None
            and getattr(engine, "model", None) is not None
            and getattr(engine, "calibrator", None) is not None
            and getattr(engine, "production_module", None) is not None
            and getattr(engine, "feature_engineer", None) is not None
            and self._metadata is not None
            and self._manifest is not None
            and self._calibration_config is not None
        )

    @property
    def initialization_error(self) -> Exception | None:
        return self._initialization_error

    def initialize(self) -> bool:
        """Load and verify the deployment once; keep failures available to health."""
        with self._initialization_lock:
            if self._initialization_attempted:
                return self.initialized
            self._initialization_attempted = True
            try:
                self._validate_deployment_files()
                module = self._load_module(INFERENCE_MODULE_PATH, "fraudlens_frozen_integrated_inference")
                inference_class = getattr(module, "IntegratedFraudInference")
                self._engine = inference_class(
                    production_feature_module_path=INFERENCE_MODULE_PATH.with_name(
                        "production_feature_engineering.py"
                    ),
                    deployment_dir=self.deployment_dir,
                )
                self._metadata = self._read_json(self.deployment_dir / "model_metadata.json")
                self._manifest = self._read_json(self.deployment_dir / "deployment_freeze_manifest.json")
                self._calibration_config = self._read_json(self.deployment_dir / "calibration_config.json")
                if self._manifest.get("freeze_status") != "PASS":
                    raise RuntimeError("Frozen deployment manifest does not report PASS.")
                if self._engine.model.num_feature() != int(self._metadata["feature_count"]):
                    raise RuntimeError("Loaded model feature count does not match deployment metadata.")
                logger.info("Frozen inference engine initialized; model_version=%s", self.model_version)
                return True
            except Exception as exc:
                self._engine = None
                self._initialization_error = exc
                self._integrity_verified = False
                self._metadata = None
                self._manifest = None
                self._calibration_config = None
                logger.exception("Frozen inference engine initialization failed")
                return False

    @property
    def model_version(self) -> str | None:
        if self._metadata is None:
            return None
        return str(self._metadata.get("model_version", "")) or None

    def status(self) -> dict[str, Any]:
        engine = self._engine
        ready = self.ready
        return {
            "api_status": "ok" if ready else "degraded",
            "inference_service_initialized": ready,
            "integrity_verified": self._integrity_verified,
            "model_loaded": ready and engine is not None and getattr(engine, "model", None) is not None,
            "feature_engineering_loaded": ready and engine is not None
            and getattr(engine, "production_module", None) is not None
            and getattr(engine, "feature_engineer", None) is not None,
            "calibrator_loaded": ready and engine is not None and getattr(engine, "calibrator", None) is not None,
            "model_version": self.model_version,
        }

    def model_info(self) -> dict[str, Any]:
        if not self.ready or self._metadata is None or self._manifest is None:
            raise InferenceUnavailableError("Frozen inference service is not initialized.")
        calibration = self._calibration_config or {}
        calibration_contract = self._manifest.get("calibration_contract", {})
        return {
            "model_version": self._metadata.get("model_version"),
            "model_type": self._metadata.get("model"),
            "feature_count": self._metadata.get("feature_count"),
            "calibration": calibration.get("method"),
            "calibration_input": calibration_contract.get("transform"),
            "status": "frozen" if self._manifest.get("freeze_status") == "PASS" else "unverified",
        }

    def predict_transaction(self, transaction: Mapping[str, Any]) -> dict[str, Any]:
        """Call the frozen inference method with state updates enabled."""
        if not self.ready or self._engine is None:
            raise InferenceUnavailableError("Frozen inference service is not initialized.")
        # One process-local engine owns chronological behavioral state. This lock
        # serializes state reads, prediction, and updates across request threads.
        with self._prediction_lock:
            result = self._engine.predict_transaction(transaction, update_state=True)
        return {
            "model_version": result["model_version"],
            "transaction_id": transaction["TransactionID"],
            "raw_probability": float(result["raw_probability"]),
            "calibrated_fraud_probability": float(result["calibrated_fraud_probability"]),
        }

    def _validate_deployment_files(self) -> None:
        required = (
            self.deployment_dir / "model" / "lightgbm_behavioral.txt",
            self.deployment_dir / "calibration" / "platt_calibrator.joblib",
            self.deployment_dir / "feature_schema_normalized.json",
            self.deployment_dir / "model_metadata.json",
            self.deployment_dir / "calibration_config.json",
            self.deployment_dir / "deployment_freeze_manifest.json",
            self.deployment_dir / "checksums_sha256.json",
            INFERENCE_MODULE_PATH,
            INFERENCE_MODULE_PATH.with_name("production_feature_engineering.py"),
        )
        missing = [str(path) for path in required if not path.is_file()]
        if missing:
            raise DeploymentIntegrityError("Frozen deployment integrity verification failed: required file missing.")

        manifest_path = self.deployment_dir / "deployment_freeze_manifest.json"
        checksum_path = self.deployment_dir / "checksums_sha256.json"
        try:
            manifest = self._read_json(manifest_path)
            checksum_index = self._read_json(checksum_path)
            expected_hashes = checksum_index.get("deployment_files")
            if not isinstance(expected_hashes, dict) or not expected_hashes:
                raise DeploymentIntegrityError(
                    "Frozen deployment integrity verification failed: checksum index has no deployment_files entries."
                )
            missing_hashes = REQUIRED_CHECKSUM_FILES.difference(expected_hashes)
            if missing_hashes:
                raise DeploymentIntegrityError(
                    "Frozen deployment integrity verification failed: checksum index is missing required entries: "
                    + ", ".join(sorted(missing_hashes))
                )

            for relative_path, expected_hash in expected_hashes.items():
                if not isinstance(relative_path, str) or not isinstance(expected_hash, str):
                    raise DeploymentIntegrityError(
                        "Frozen deployment integrity verification failed: invalid checksum entry."
                    )
                relative = Path(relative_path)
                artifact_path = (self.deployment_dir / relative).resolve()
                if relative.is_absolute() or not artifact_path.is_relative_to(self.deployment_dir):
                    raise DeploymentIntegrityError(
                        "Frozen deployment integrity verification failed: invalid checksum path."
                    )
                if not artifact_path.is_file():
                    raise DeploymentIntegrityError(
                        "Frozen deployment integrity verification failed: a checksummed file is missing."
                    )
                digest = hashlib.sha256()
                try:
                    with artifact_path.open("rb") as artifact_file:
                        for chunk in iter(lambda: artifact_file.read(1024 * 1024), b""):
                            digest.update(chunk)
                except OSError as exc:
                    raise DeploymentIntegrityError(
                        "Frozen deployment integrity verification failed: a checksummed file is unreadable."
                    ) from exc
                if digest.hexdigest().lower() != expected_hash.lower():
                    raise DeploymentIntegrityError(
                        "Frozen deployment integrity verification failed: a file checksum does not match."
                    )
        except DeploymentIntegrityError:
            raise
        except (OSError, json.JSONDecodeError, TypeError, ValueError) as exc:
            raise DeploymentIntegrityError(
                "Frozen deployment integrity verification failed: checksum metadata is unreadable or invalid."
            ) from exc

        if manifest.get("freeze_status") != "PASS":
            raise DeploymentIntegrityError(
                "Frozen deployment integrity verification failed: freeze status is not PASS."
            )
        self._integrity_verified = True

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        with path.open("r", encoding="utf-8") as file:
            value = json.load(file)
        if not isinstance(value, dict):
            raise RuntimeError(f"Expected JSON object in deployment metadata: {path.name}")
        return value

    @staticmethod
    def _load_module(path: Path, module_name: str) -> ModuleType:
        spec = importlib.util.spec_from_file_location(module_name, path)
        if spec is None or spec.loader is None:
            raise ImportError("Could not load the frozen inference module.")
        module = importlib.util.module_from_spec(spec)
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module


# One service and (after initialization) one inference engine per Python process.
inference_service = InferenceService()
