
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Mapping

import importlib.util
import json
import sys

import joblib
import lightgbm as lgb
import numpy as np


class IntegratedFraudInference:
    """
    Stateful raw-transaction fraud inference.

    raw transaction
        -> production feature engineering
        -> exact 22 features
        -> LightGBM
        -> Platt calibration
    """

    def __init__(
        self,
        production_feature_module_path: str | Path,
        deployment_dir: str | Path,
    ) -> None:

        self.production_feature_module_path = Path(
            production_feature_module_path
        )

        self.deployment_dir = Path(
            deployment_dir
        )

        self.production_module = (
            self._load_module(
                self.production_feature_module_path,
                "integrated_production_feature_runtime",
            )
        )

        self.feature_engineer = (
            self.production_module
            .ProductionFeatureEngineer()
        )

        with open(
            self.deployment_dir
            / "feature_schema_normalized.json",
            "r",
            encoding="utf-8",
        ) as handle:

            schema_payload = json.load(
                handle
            )

        self.feature_schema = [
            item["name"]
            for item
            in schema_payload["features"]
        ]

        self.model = lgb.Booster(
            model_file=str(
                self.deployment_dir
                / "model"
                / "lightgbm_behavioral.txt"
            )
        )

        self.calibrator = joblib.load(
            self.deployment_dir
            / "calibration"
            / "platt_calibrator.joblib"
        )

        with open(
            self.deployment_dir
            / "model_metadata.json",
            "r",
            encoding="utf-8",
        ) as handle:

            self.metadata = json.load(
                handle
            )

        if (
            list(
                self.model.feature_name()
            )
            !=
            self.feature_schema
        ):

            raise ValueError(
                "Model feature order does not match deployment schema."
            )

        if (
            list(
                self.production_module
                .FEATURE_SCHEMA
            )
            !=
            self.feature_schema
        ):

            raise ValueError(
                "Production feature schema does not match deployment schema."
            )

    @staticmethod
    def _load_module(
        path: Path,
        name: str,
    ):

        spec = importlib.util.spec_from_file_location(
            name,
            str(path),
        )

        if spec is None or spec.loader is None:

            raise ImportError(
                f"Could not load feature module: {path}"
            )

        module = importlib.util.module_from_spec(
            spec
        )

        sys.modules[name] = module

        spec.loader.exec_module(
            module
        )

        return module

    def _calibrate(
        self,
        raw_probability: float,
    ) -> float:
        # E7 calibration contract:
        # The Platt LogisticRegression calibrator was fitted
        # using logit(raw_probability) as its input feature.
        #
        # Therefore production inference must apply the same
        # transformation before calling the calibrator.

        probability = float(raw_probability)

        if not (
            0.0 <= probability <= 1.0
        ):
            raise ValueError(
                "Raw probability must be between 0 and 1."
            )

        # Avoid log(0) and division by zero at the boundaries.
        clipped_probability = float(
            np.clip(
                probability,
                1e-15,
                1.0 - 1e-15,
            )
        )

        logit_probability = float(
            np.log(
                clipped_probability
                / (
                    1.0
                    - clipped_probability
                )
            )
        )

        x = np.asarray(
            [[logit_probability]],
            dtype=float,
        )

        if hasattr(
            self.calibrator,
            "predict_proba",
        ):
            return float(
                self.calibrator
                .predict_proba(x)[0, 1]
            )

        if hasattr(
            self.calibrator,
            "decision_function",
        ):
            decision = float(
                self.calibrator
                .decision_function(x)[0]
            )

            return float(
                1.0
                / (
                    1.0
                    + np.exp(-decision)
                )
            )

        raise TypeError(
            "Unsupported calibration object."
        )

    def predict_transaction(
        self,
        transaction: Mapping[str, Any],
        update_state: bool = True,
    ) -> Dict[str, Any]:

        features = (
            self.feature_engineer
            .transform(
                transaction,
                update_state=update_state,
            )
        )

        if (
            list(features.keys())
            !=
            list(self.feature_schema)
        ):

            raise ValueError(
                "Generated feature order does not match deployment schema."
            )

        values = np.asarray(
            [
                features[name]
                for name
                in self.feature_schema
            ],
            dtype=float,
        ).reshape(
            1,
            -1,
        )

        if not np.isfinite(
            values
        ).all():

            raise ValueError(
                "Generated features contain NaN or infinite values."
            )

        raw_probability = float(
            self.model.predict(
                values
            )[0]
        )

        calibrated_probability = (
            self._calibrate(
                raw_probability
            )
        )

        if not (
            0.0
            <=
            raw_probability
            <=
            1.0
        ):

            raise ValueError(
                "Invalid raw probability."
            )

        if not (
            0.0
            <=
            calibrated_probability
            <=
            1.0
        ):

            raise ValueError(
                "Invalid calibrated probability."
            )

        return {
            "model_version":
                self.metadata.get(
                    "model_version",
                    "unknown",
                ),

            "raw_probability":
                raw_probability,

            "calibrated_fraud_probability":
                calibrated_probability,
        }
