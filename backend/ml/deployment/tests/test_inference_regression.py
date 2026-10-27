
import importlib
import os
import json
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(
    os.environ.get(
        "FRAUD_PROJECT_ROOT",
        "/content/drive/MyDrive/fraud-detection-platform",
    )
)

DEPLOYMENT_ROOT = (
    PROJECT_ROOT
    / "artifacts"
    / "deployment"
)

MODEL_PACKAGE = (
    DEPLOYMENT_ROOT
    / "fraud_model_v1"
)

INFERENCE_ROOT = (
    DEPLOYMENT_ROOT
    / "inference"
)

E2E_REPORT_PATH = (
    PROJECT_ROOT
    / "artifacts"
    / "evaluation"
    / "end_to_end_inference"
    / "e2e_inference_integration_report.json"
)

E7_PATH = (
    PROJECT_ROOT
    / "artifacts"
    / "models"
    / "E7_calibration"
    / "e7_validation_predictions.csv"
)

INTEGRATED_PATH = (
    INFERENCE_ROOT
    / "integrated_inference.py"
)

PRODUCTION_FEATURE_PATH = (
    INFERENCE_ROOT
    / "production_feature_engineering.py"
)

TOLERANCE = 1e-12


class TestInferenceRegression(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if str(INFERENCE_ROOT) not in sys.path:
            sys.path.insert(
                0,
                str(INFERENCE_ROOT),
            )

        if "integrated_inference" in sys.modules:
            del sys.modules["integrated_inference"]

        cls.integrated_inference = importlib.import_module(
            "integrated_inference"
        )

        cls.IntegratedFraudInference = (
            cls.integrated_inference
            .IntegratedFraudInference
        )

        cls.engine = (
            cls.IntegratedFraudInference(
                production_feature_module_path=(
                    PRODUCTION_FEATURE_PATH
                ),
                deployment_dir=MODEL_PACKAGE,
            )
        )

        cls.e7 = (
            pd.read_csv(E7_PATH)
            .sort_values(
                [
                    "TransactionDT",
                    "TransactionID",
                ],
                kind="mergesort",
            )
            .head(20)
            .copy()
        )

    def test_e2e_report_is_pass(self):
        with E2E_REPORT_PATH.open(
            "r",
            encoding="utf-8",
        ) as handle:
            report = json.load(handle)

        self.assertTrue(
            report.get(
                "overall_pass",
                False,
            )
        )

        self.assertTrue(
            report.get(
                "raw_reproducibility_pass",
                False,
            )
        )

        self.assertTrue(
            report.get(
                "calibrated_reproducibility_pass",
                False,
            )
        )

    def test_platt_calibration_matches_e7(self):
        raw = (
            self.e7[
                "raw_e3_probability"
            ]
            .astype(float)
            .to_numpy()
        )

        expected = (
            self.e7[
                "calibrated_e3_probability"
            ]
            .astype(float)
            .to_numpy()
        )

        actual = np.asarray(
            [
                self.engine._calibrate(
                    value
                )
                for value in raw
            ],
            dtype=float,
        )

        max_error = float(
            np.max(
                np.abs(
                    actual
                    - expected
                )
            )
        )

        self.assertLessEqual(
            max_error,
            TOLERANCE,
            msg=(
                "Calibration regression failed. "
                f"Maximum error={max_error:.18e}"
            ),
        )

    def test_required_source_contract_present(self):
        source = INTEGRATED_PATH.read_text(
            encoding="utf-8"
        )

        required_markers = [
            "clipped_probability",
            "logit_probability",
            "np.clip(",
            "np.log(",
        ]

        for marker in required_markers:
            self.assertIn(
                marker,
                source,
                msg=(
                    f"Missing calibration marker: {marker}"
                ),
            )


if __name__ == "__main__":
    unittest.main(
        verbosity=2
    )
