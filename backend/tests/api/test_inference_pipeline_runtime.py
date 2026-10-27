"""Functional tests for stateful inference; synthetic inputs are not quality evidence."""

from __future__ import annotations

import math
import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services.inference_service import InferenceService


@pytest.fixture(scope="module")
def inference_service() -> InferenceService:
    service = InferenceService()
    assert service.initialize()
    return service


def test_runtime_failure_returns_generic_error_without_exception_details(
    inference_service: InferenceService,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert inference_service._engine is not None

    def fail_prediction(transaction, update_state=True):
        raise RuntimeError("synthetic-secret-stack-trace-marker")

    monkeypatch.setattr(inference_service._engine, "predict_transaction", fail_prediction)
    client = TestClient(create_app(service=inference_service))

    with client:
        response = client.post(
            "/api/v1/predict",
            json={
                "transaction": {
                    "TransactionID": "synthetic-runtime-failure",
                    "TransactionDT": 12192900,
                    "TransactionAmt": 25.0,
                }
            },
        )

    assert response.status_code == 500
    assert response.json() == {
        "error": "inference_error",
        "message": "Prediction could not be completed.",
    }
    assert "synthetic-secret-stack-trace-marker" not in response.text


def test_history_updates_repeated_and_concurrent_predictions_are_serialized(
    inference_service: InferenceService,
) -> None:
    assert inference_service._engine is not None
    engineer = inference_service._engine.feature_engineer
    card = f"synthetic-card-{uuid.uuid4().hex}"
    history = engineer.state.card1
    assert card not in history

    first = inference_service.predict_transaction(
        {
            "TransactionID": "synthetic-no-history",
            "TransactionDT": 12192900,
            "TransactionAmt": 25.0,
            "card1": card,
        }
    )
    assert history[card].count == 1

    repeated = inference_service.predict_transaction(
        {
            "TransactionID": "synthetic-with-history",
            "TransactionDT": 12192960,
            "TransactionAmt": 45.0,
            "card1": card,
        }
    )
    assert history[card].count == 2

    concurrent_transactions = [
        {
            "TransactionID": f"synthetic-concurrent-{index}",
            "TransactionDT": 12193020,
            "TransactionAmt": 30.0 + index,
            "card1": card,
        }
        for index in range(8)
    ]
    with ThreadPoolExecutor(max_workers=8) as executor:
        concurrent_results = list(
            executor.map(inference_service.predict_transaction, concurrent_transactions)
        )

    assert history[card].count == 10
    for result in [first, repeated, *concurrent_results]:
        assert result["model_version"] == "fraud_model_v1"
        assert math.isfinite(result["raw_probability"])
        assert math.isfinite(result["calibrated_fraud_probability"])
        assert 0.0 <= result["raw_probability"] <= 1.0
        assert 0.0 <= result["calibrated_fraud_probability"] <= 1.0
