"""Portable regression coverage for the frozen fraud_model_v1 deployment.

The synthetic transaction tests exercise inference mechanics only. They are
not substitutes for the missing E7 validation predictions or E2E report.
"""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path
from types import ModuleType
from typing import Any
from uuid import uuid4

import numpy as np
import pandas as pd
import pytest


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
DEPLOYMENT_ROOT = REPOSITORY_ROOT / "backend" / "ml" / "deployment"
MODEL_PACKAGE = DEPLOYMENT_ROOT / "fraud_model_v1"
INFERENCE_ROOT = DEPLOYMENT_ROOT / "inference"
INTEGRATED_PATH = INFERENCE_ROOT / "integrated_inference.py"
PRODUCTION_FEATURE_PATH = INFERENCE_ROOT / "production_feature_engineering.py"

# These are the repository-relative equivalents of the original Colab paths.
E2E_REPORT_PATH = (
    REPOSITORY_ROOT
    / "artifacts"
    / "evaluation"
    / "end_to_end_inference"
    / "e2e_inference_integration_report.json"
)
E7_PATH = (
    REPOSITORY_ROOT
    / "artifacts"
    / "models"
    / "E7_calibration"
    / "e7_validation_predictions.csv"
)

TOLERANCE = 1e-12
INTEGRATED_MODULE_NAME = "_fraudlens_portable_regression_integrated_inference"


def _load_integrated_module() -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        INTEGRATED_MODULE_NAME,
        INTEGRATED_PATH,
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load frozen inference module at {INTEGRATED_PATH}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def inference_engine():
    module = _load_integrated_module()
    return module.IntegratedFraudInference(
        production_feature_module_path=PRODUCTION_FEATURE_PATH,
        deployment_dir=MODEL_PACKAGE,
    )


def _synthetic_transaction(transaction_id: str, transaction_dt: float) -> dict[str, Any]:
    return {
        "TransactionID": transaction_id,
        "TransactionDT": transaction_dt,
        "TransactionAmt": 125.40,
        "card1": f"portable-test-card-{uuid4().hex}",
        "addr1": 100,
        "P_emaildomain": "example.com",
    }


def test_synthetic_prediction_uses_frozen_model_and_calibrator(inference_engine) -> None:
    transaction = _synthetic_transaction("synthetic-portable-1", 12192900)

    result = inference_engine.predict_transaction(transaction)

    assert result["model_version"] == "fraud_model_v1"
    assert math.isfinite(result["raw_probability"])
    assert math.isfinite(result["calibrated_fraud_probability"])
    assert 0.0 <= result["raw_probability"] <= 1.0
    assert 0.0 <= result["calibrated_fraud_probability"] <= 1.0


def test_synthetic_feature_history_uses_prior_transactions_only(inference_engine) -> None:
    first_transaction = _synthetic_transaction("synthetic-history-1", 12192900)
    first_features = inference_engine.feature_engineer.transform(
        first_transaction,
        update_state=False,
    )
    assert first_features["card1_prev_count"] == 0

    inference_engine.predict_transaction(first_transaction)

    second_transaction = dict(first_transaction)
    second_transaction.update(
        TransactionID="synthetic-history-2",
        TransactionDT=12192960,
        TransactionAmt=80.0,
    )
    second_features = inference_engine.feature_engineer.transform(
        second_transaction,
        update_state=False,
    )
    assert second_features["card1_prev_count"] == 1
    assert second_features["card1_has_history"] == 1

    second_result = inference_engine.predict_transaction(second_transaction)
    assert second_result["model_version"] == "fraud_model_v1"


def test_frozen_source_retains_calibration_contract() -> None:
    source = INTEGRATED_PATH.read_text(encoding="utf-8")
    for marker in ("clipped_probability", "logit_probability", "np.clip(", "np.log("):
        assert marker in source, f"Missing calibration marker: {marker}"


def test_e7_calibration_matches_trusted_validation_predictions(inference_engine) -> None:
    if not E7_PATH.is_file():
        pytest.skip(
            "BLOCKED: trusted E7 row-level fixture is unavailable at "
            f"{E7_PATH}; E7_raw_vs_calibrated_comparison.csv contains aggregate "
            "metrics, not the raw/calibrated prediction rows required for this assertion."
        )

    e7 = pd.read_csv(E7_PATH).sort_values(
        ["TransactionDT", "TransactionID"],
        kind="mergesort",
    ).head(20)
    raw = e7["raw_e3_probability"].astype(float).to_numpy()
    expected = e7["calibrated_e3_probability"].astype(float).to_numpy()
    actual = np.asarray(
        [inference_engine._calibrate(value) for value in raw],
        dtype=float,
    )
    max_error = float(np.max(np.abs(actual - expected)))

    assert max_error <= TOLERANCE, (
        "Calibration regression failed. "
        f"Maximum error={max_error:.18e}"
    )


def test_e2e_reproducibility_report_is_pass() -> None:
    if not E2E_REPORT_PATH.is_file():
        pytest.skip(
            "BLOCKED: trusted E2E inference report is unavailable at "
            f"{E2E_REPORT_PATH}; no report was generated or substituted."
        )

    with E2E_REPORT_PATH.open("r", encoding="utf-8") as handle:
        report = json.load(handle)

    assert report.get("overall_pass", False)
    assert report.get("raw_reproducibility_pass", False)
    assert report.get("calibrated_reproducibility_pass", False)
