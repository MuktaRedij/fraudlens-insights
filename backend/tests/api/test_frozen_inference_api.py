"""Integration coverage for the frozen fraud_model_v1 FastAPI adapter."""

from __future__ import annotations

import math
import json
import hashlib
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app, create_app
from app.services.inference_service import InferenceService, REQUIRED_CHECKSUM_FILES

DEPLOYMENT_DIR = Path(__file__).resolve().parents[2] / "ml" / "deployment" / "fraud_model_v1"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def validation_transaction() -> dict[str, object]:
    # TransactionID 3459432 is present in the checked-in frozen E7
    # prediction-reproducibility file. That file does not include raw feature
    # inputs, so assertions intentionally validate the real result contract,
    # not invented golden probabilities.
    return {
        "TransactionID": 3459432,
        "TransactionDT": 12192900,
        "TransactionAmt": 125.40,
        "card1": 1234,
        "addr1": 100,
        "P_emaildomain": "example.com",
    }


def test_health_reports_loaded_frozen_runtime(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["api_status"] == "ok"
    assert body["inference_service_initialized"] is True
    assert body["model_loaded"] is True
    assert body["calibrator_loaded"] is True
    assert body["feature_engineering_loaded"] is True
    assert body["model_version"] == "fraud_model_v1"


def test_model_endpoint_reads_frozen_metadata(client: TestClient) -> None:
    response = client.get("/api/v1/model")

    assert response.status_code == 200
    assert response.json() == {
        "model_version": "fraud_model_v1",
        "model_type": "LightGBM",
        "feature_count": 22,
        "calibration": "Platt scaling",
        "calibration_input": "logit(raw_probability)",
        "status": "frozen",
    }


def test_system_status_reflects_actual_runtime(client: TestClient) -> None:
    response = client.get("/api/v1/system/status")

    assert response.status_code == 200
    body = response.json()
    assert body["api_status"] == "ok"
    assert body["model_loaded"] is True
    assert body["feature_engineering_loaded"] is True
    assert body["calibrator_loaded"] is True
    assert body["model_version"] == "fraud_model_v1"


def test_valid_request_returns_frozen_prediction(client: TestClient, validation_transaction) -> None:
    response = client.post("/api/v1/predict", json={"transaction": validation_transaction})

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "model_version",
        "transaction_id",
        "raw_probability",
        "calibrated_fraud_probability",
    }
    assert body["model_version"] == "fraud_model_v1"
    assert body["transaction_id"] == validation_transaction["TransactionID"]
    assert math.isfinite(body["raw_probability"])
    assert math.isfinite(body["calibrated_fraud_probability"])
    assert 0.0 <= body["raw_probability"] <= 1.0
    assert 0.0 <= body["calibrated_fraud_probability"] <= 1.0
    assert not {"risk_score", "decision", "explanation"}.intersection(body)


@pytest.mark.parametrize(
    ("field", "value", "expected_status"),
    [
        ("TransactionAmt", None, 422),
        ("TransactionAmt", -1.0, 422),
        ("TransactionAmt", "not-a-number", 422),
        ("TransactionAmt", float("nan"), 422),
        ("TransactionAmt", float("inf"), 422),
        ("TransactionDT", "invalid", 422),
    ],
)
def test_invalid_numeric_values_are_rejected(
    client: TestClient,
    validation_transaction: dict[str, object],
    field: str,
    value: object,
    expected_status: int,
) -> None:
    transaction = dict(validation_transaction)
    transaction[field] = value

    if isinstance(value, float) and not math.isfinite(value):
        # Non-standard JSON tokens are deliberately sent raw so the API's
        # finite-number validation is exercised rather than the client encoder.
        response = client.post(
            "/api/v1/predict",
            content=json.dumps({"transaction": transaction}, allow_nan=True),
            headers={"Content-Type": "application/json"},
        )
    else:
        response = client.post("/api/v1/predict", json={"transaction": transaction})

    assert response.status_code == expected_status
    assert response.json()["error"] == "validation_error"


@pytest.mark.parametrize("missing_field", ["TransactionAmt", "TransactionID", "TransactionDT"])
def test_required_fields_are_rejected(
    client: TestClient,
    validation_transaction: dict[str, object],
    missing_field: str,
) -> None:
    transaction = dict(validation_transaction)
    transaction.pop(missing_field)

    response = client.post("/api/v1/predict", json={"transaction": transaction})

    assert response.status_code == 422
    assert response.json()["error"] == "validation_error"


def test_checksum_index_covers_and_matches_expected_deployment_files() -> None:
    checksum_index = json.loads((DEPLOYMENT_DIR / "checksums_sha256.json").read_text(encoding="utf-8"))
    deployment_files = checksum_index["deployment_files"]

    assert set(deployment_files) == REQUIRED_CHECKSUM_FILES
    assert len(deployment_files) == 11
    for relative_path, expected_hash in deployment_files.items():
        artifact = DEPLOYMENT_DIR / relative_path
        assert artifact.is_file()
        assert hashlib.sha256(artifact.read_bytes()).hexdigest() == expected_hash


def _app_for_temporary_deployment(deployment_dir: Path) -> tuple[InferenceService, TestClient]:
    service = InferenceService(deployment_dir=deployment_dir)
    return service, TestClient(create_app(service=service))


def test_missing_frozen_artifact_keeps_service_not_ready(tmp_path: Path, caplog) -> None:
    temporary_deployment = tmp_path / "fraud_model_v1"
    shutil.copytree(DEPLOYMENT_DIR, temporary_deployment)
    (temporary_deployment / "model" / "lightgbm_behavioral.txt").unlink()

    service, test_client = _app_for_temporary_deployment(temporary_deployment)
    with test_client as isolated_client:
        health = isolated_client.get("/health")
        system = isolated_client.get("/api/v1/system/status")
        model = isolated_client.get("/api/v1/model")
        prediction = isolated_client.post("/api/v1/predict", json={"transaction": {
            "TransactionID": 3459432,
            "TransactionDT": 12192900,
            "TransactionAmt": 125.4,
        }})

    assert service.initialized is False
    assert health.status_code == 503
    assert health.json()["api_status"] == "degraded"
    assert health.json()["model_loaded"] is False
    assert health.json()["error"] == "service_not_ready"
    assert system.json()["api_status"] == "degraded"
    assert system.json()["model_loaded"] is False
    assert model.status_code == 503
    assert model.json()["error"] == "service_not_ready"
    assert prediction.status_code == 503
    assert prediction.json()["error"] == "service_not_ready"
    assert str(temporary_deployment) not in health.text
    assert "Frozen deployment integrity verification failed" in caplog.text


def test_tampered_frozen_metadata_keeps_service_not_ready(tmp_path: Path) -> None:
    temporary_deployment = tmp_path / "fraud_model_v1"
    shutil.copytree(DEPLOYMENT_DIR, temporary_deployment)
    metadata_path = temporary_deployment / "model_metadata.json"
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["controlled_test_tamper"] = True
    metadata_path.write_text(json.dumps(metadata), encoding="utf-8")

    service, test_client = _app_for_temporary_deployment(temporary_deployment)
    with test_client as isolated_client:
        health = isolated_client.get("/health")
        system = isolated_client.get("/api/v1/system/status")

    assert service.initialized is False
    assert health.status_code == 503
    assert health.json()["model_loaded"] is False
    assert health.json()["api_status"] == "degraded"
    assert system.json()["model_loaded"] is False
    assert system.json()["api_status"] == "degraded"
    assert str(temporary_deployment) not in health.text


def test_invalid_deployment_directory_returns_unready_status(tmp_path: Path) -> None:
    service, test_client = _app_for_temporary_deployment(tmp_path / "missing-deployment")
    with test_client as isolated_client:
        health = isolated_client.get("/health")
        system = isolated_client.get("/api/v1/system/status")

    assert service.initialized is False
    assert health.status_code == 503
    assert health.json()["model_loaded"] is False
    assert health.json()["api_status"] == "degraded"
    assert system.json()["model_loaded"] is False
    assert system.json()["api_status"] == "degraded"
