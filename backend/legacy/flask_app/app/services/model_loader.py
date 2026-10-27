"""Strict loader for the verified, frozen FraudLens model artifacts.

This module prepares model integration only. It intentionally exposes no prediction
operation and never trains or substitutes another artifact.
"""

from __future__ import annotations

import importlib.util
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

EXPECTED_FEATURE_COUNT = 37
EXPECTED_CALIBRATION_METHOD = "Platt"
EXPECTED_FEATURE_METADATA = "credit_card_feature_metadata.json"
BACKEND_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MODEL_PATH = BACKEND_ROOT / "ml" / "models" / "20F_smote_lightgbm.txt"
DEFAULT_CALIBRATOR_PATH = BACKEND_ROOT / "ml" / "models" / "20H_platt_calibrator.joblib"
DEFAULT_FEATURE_METADATA_PATH = BACKEND_ROOT / "ml" / "metadata" / EXPECTED_FEATURE_METADATA
DEFAULT_CALIBRATION_METADATA_PATH = BACKEND_ROOT / "ml" / "metadata" / "20H_calibration_metadata.json"


class ArtifactError(RuntimeError):
    """Raised when a required frozen artifact is missing or incompatible."""


@dataclass(frozen=True)
class LoadedModel:
    """Loaded artifacts and metadata for the selected frozen model."""

    model: Any
    calibrator: Any
    feature_metadata: dict[str, Any]
    calibration_metadata: dict[str, Any]
    model_path: Path
    calibrator_path: Path

    @property
    def metadata(self) -> dict[str, Any]:
        features = self.feature_metadata.get("feature_columns", [])
        return {
            "model_name": "LightGBM SMOTE",
            "model_type": "LightGBM Booster",
            "calibration_method": self.calibration_metadata.get("selected_method"),
            "feature_count": len(features),
            "artifact_version": "frozen-research-artifacts",
            "model_path": str(self.model_path),
            "calibrator_path": str(self.calibrator_path),
            "shap_available": importlib.util.find_spec("shap") is not None,
        }


class ModelLoader:
    """Validate and load only the explicitly selected frozen artifacts."""

    def __init__(
        self,
        model_path: Path = DEFAULT_MODEL_PATH,
        calibrator_path: Path = DEFAULT_CALIBRATOR_PATH,
        feature_metadata_path: Path = DEFAULT_FEATURE_METADATA_PATH,
        calibration_metadata_path: Path = DEFAULT_CALIBRATION_METADATA_PATH,
    ) -> None:
        self.model_path = model_path
        self.calibrator_path = calibrator_path
        self.feature_metadata_path = feature_metadata_path
        self.calibration_metadata_path = calibration_metadata_path

    @classmethod
    def from_config(cls, config: Mapping[str, Any]) -> "ModelLoader":
        return cls(
            Path(config["MODEL_PATH"]),
            Path(config["CALIBRATOR_PATH"]),
            Path(config["FEATURE_METADATA_PATH"]),
            Path(config["CALIBRATION_METADATA_PATH"]),
        )

    def artifact_status(self) -> dict[str, Any]:
        paths = {
            "model": self.model_path,
            "calibrator": self.calibrator_path,
            "feature_metadata": self.feature_metadata_path,
            "calibration_metadata": self.calibration_metadata_path,
        }
        return {
            "required": {name: str(path) for name, path in paths.items()},
            "present": {name: path.is_file() for name, path in paths.items()},
            "ready": all(path.is_file() for path in paths.values()),
        }

    def load(self) -> LoadedModel:
        """Load and validate the exact model, calibrator, and feature contract."""
        status = self.artifact_status()
        missing = [name for name, present in status["present"].items() if not present]
        if missing:
            raise ArtifactError(f"Missing required frozen artifacts: {', '.join(missing)}")

        feature_metadata = self._read_json(self.feature_metadata_path)
        calibration_metadata = self._read_json(self.calibration_metadata_path)
        self._validate_contract(feature_metadata, calibration_metadata)

        try:
            import joblib
            import lightgbm as lgb
        except ImportError as exc:
            raise ArtifactError(
                "Loading the frozen model requires the backend dependencies "
                "lightgbm and joblib to be installed."
            ) from exc

        try:
            model = lgb.Booster(model_file=str(self.model_path))
            calibrator = joblib.load(self.calibrator_path)
        except Exception as exc:
            raise ArtifactError(f"Unable to load frozen model artifacts: {exc}") from exc

        actual_feature_count = getattr(model, "num_feature", lambda: None)()
        if actual_feature_count is not None and actual_feature_count != EXPECTED_FEATURE_COUNT:
            raise ArtifactError(
                f"Model feature count {actual_feature_count} does not match "
                f"metadata contract {EXPECTED_FEATURE_COUNT}."
            )
        if not callable(getattr(calibrator, "predict", None)):
            raise ArtifactError("Platt calibrator is incompatible: it has no callable predict method.")

        return LoadedModel(
            model=model,
            calibrator=calibrator,
            feature_metadata=feature_metadata,
            calibration_metadata=calibration_metadata,
            model_path=self.model_path,
            calibrator_path=self.calibrator_path,
        )

    @staticmethod
    def _read_json(path: Path) -> dict[str, Any]:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ArtifactError(f"Unable to read metadata artifact {path}: {exc}") from exc
        if not isinstance(value, dict):
            raise ArtifactError(f"Metadata artifact must contain a JSON object: {path}")
        return value

    @staticmethod
    def _validate_contract(feature_metadata: dict[str, Any], calibration_metadata: dict[str, Any]) -> None:
        feature_columns = feature_metadata.get("feature_columns")
        if not isinstance(feature_columns, list) or len(feature_columns) != EXPECTED_FEATURE_COUNT:
            raise ArtifactError(
                f"Expected {EXPECTED_FEATURE_COUNT} ordered feature columns in "
                f"{EXPECTED_FEATURE_METADATA}."
            )
        if feature_metadata.get("target") != "Class":
            raise ArtifactError("Feature metadata target must be 'Class'.")
        if calibration_metadata.get("selected_method") != EXPECTED_CALIBRATION_METHOD:
            raise ArtifactError(
                "The selected calibrator is not Platt; refusing to substitute a different method."
            )


# Backward-compatible name used by the health foundation before the public API
# was standardized as ModelLoader.
FrozenModelLoader = ModelLoader
