"""
Fraud Detection Model Inference

Standalone inference layer for fraud_model_v1.

This module loads:
    - LightGBM behavioral model
    - Platt calibration model
    - feature schema

It accepts the already-engineered 22-feature vector and
returns a calibrated fraud probability.

Raw transaction feature engineering is intentionally kept
outside this module until the production feature-engineering
layer is implemented and validated.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Mapping

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd


class ModelInputError(ValueError):
    """Raised when inference input fails validation."""


class FraudModelInference:
    """
    Production inference wrapper for fraud_model_v1.

    The class loads all deployment artifacts from a fixed
    versioned deployment directory and performs deterministic
    inference using the saved model and calibration artifact.
    """

    def __init__(self, deployment_root: str | Path) -> None:
        self.deployment_root = Path(deployment_root)

        if not self.deployment_root.exists():
            raise FileNotFoundError(
                f"Deployment directory does not exist: "
                f"{self.deployment_root}"
            )

        self.model_path = (
            self.deployment_root
            / "model"
            / "lightgbm_behavioral.txt"
        )

        self.calibrator_path = (
            self.deployment_root
            / "calibration"
            / "platt_calibrator.joblib"
        )

        self.feature_schema_path = (
            self.deployment_root
            / "feature_schema.json"
        )

        self.model_config_path = (
            self.deployment_root
            / "model_config.json"
        )

        self.metadata_path = (
            self.deployment_root
            / "model_metadata.json"
        )

        self._validate_artifacts()

        self.feature_schema = self._load_json(
            self.feature_schema_path
        )

        self.model_config = self._load_json(
            self.model_config_path
        )

        self.metadata = self._load_json(
            self.metadata_path
        )

        self.features = [
            item["name"]
            for item in self.feature_schema["features"]
        ]

        self.model = lgb.Booster(
            model_file=str(self.model_path)
        )

        self.calibrator = joblib.load(
            self.calibrator_path
        )

    # --------------------------------------------------------
    # Artifact loading
    # --------------------------------------------------------

    @staticmethod
    def _load_json(path: Path) -> Dict[str, Any]:
        """Load a JSON deployment artifact."""
        try:
            with path.open("r", encoding="utf-8") as file:
                data = json.load(file)
        except json.JSONDecodeError as exc:
            raise RuntimeError(
                f"Invalid JSON artifact: {path}"
            ) from exc

        if not isinstance(data, dict):
            raise RuntimeError(
                f"Expected JSON object in: {path}"
            )

        return data

    def _validate_artifacts(self) -> None:
        """Verify all required deployment artifacts exist."""
        required = [
            self.model_path,
            self.calibrator_path,
            self.feature_schema_path,
            self.model_config_path,
            self.metadata_path,
        ]

        missing = [
            str(path)
            for path in required
            if not path.exists()
        ]

        if missing:
            raise FileNotFoundError(
                "Missing deployment artifacts:\n"
                + "\n".join(missing)
            )

    # --------------------------------------------------------
    # Input validation
    # --------------------------------------------------------

    def validate_features(
        self,
        features: Mapping[str, Any],
    ) -> None:
        """
        Validate the engineered model feature vector.

        Requirements:
            - exact feature set
            - no missing features
            - no unexpected features
            - numeric values only
            - finite values only
        """

        if not isinstance(features, Mapping):
            raise ModelInputError(
                "Inference input must be a mapping of "
                "feature names to values."
            )

        provided = set(features.keys())
        expected = set(self.features)

        missing = expected - provided
        unexpected = provided - expected

        if missing:
            raise ModelInputError(
                "Missing required features: "
                + ", ".join(sorted(missing))
            )

        if unexpected:
            raise ModelInputError(
                "Unexpected features: "
                + ", ".join(sorted(unexpected))
            )

        for feature in self.features:
            value = features[feature]

            if value is None:
                raise ModelInputError(
                    f"Feature '{feature}' cannot be None."
                )

            try:
                numeric_value = float(value)
            except (TypeError, ValueError) as exc:
                raise ModelInputError(
                    f"Feature '{feature}' must be numeric."
                ) from exc

            if not np.isfinite(numeric_value):
                raise ModelInputError(
                    f"Feature '{feature}' must be finite."
                )

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    def predict(
        self,
        features: Mapping[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate raw and calibrated fraud probabilities.

        Returns:
            Dictionary containing model version,
            raw probability and calibrated probability.
        """

        self.validate_features(features)

        # Preserve exact training feature order.
        row = {
            feature: float(features[feature])
            for feature in self.features
        }

        dataframe = pd.DataFrame(
            [row],
            columns=self.features,
        )

        # Raw E3 LightGBM probability.
        raw_probability = float(
            self.model.predict(dataframe)[0]
        )

        raw_probability = float(
            np.clip(
                raw_probability,
                1e-15,
                1.0 - 1e-15,
            )
        )

        # Apply the same Platt transformation used during E7.
        logit = np.log(
            raw_probability
            / (1.0 - raw_probability)
        )

        calibrated_probability = float(
            self.calibrator.predict_proba(
                np.array([[logit]])
            )[0, 1]
        )

        calibrated_probability = float(
            np.clip(
                calibrated_probability,
                0.0,
                1.0,
            )
        )

        return {
            "model_version": self.metadata[
                "model_version"
            ],
            "raw_probability": raw_probability,
            "calibrated_fraud_probability": (
                calibrated_probability
            ),
        }


def load_model(
    deployment_root: str | Path,
) -> FraudModelInference:
    """
    Convenience function for loading the deployment model.
    """
    return FraudModelInference(deployment_root)
