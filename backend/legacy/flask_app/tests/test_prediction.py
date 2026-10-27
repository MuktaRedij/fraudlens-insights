import math

import pytest

from legacy.flask_app.app import create_app
from legacy.flask_app.app.services.feature_engineering import FEATURE_ORDER, build_credit_card_features
from legacy.flask_app.app.services.prediction_service import determine_risk_level


@pytest.fixture
def transaction_payload() -> dict[str, float]:
    return {**{f"V{i}": float(i) for i in range(1, 29)}, "Amount": 10.0, "Time": 90000.0}


def test_feature_engineering_has_exact_order_and_formulas(transaction_payload) -> None:
    frame = build_credit_card_features(transaction_payload)

    assert frame.shape == (1, 37)
    assert list(frame.columns) == FEATURE_ORDER
    assert frame.loc[0, "log_amount"] == pytest.approx(math.log1p(10.0))
    assert frame.loc[0, "time_hours"] == pytest.approx(90000.0 / 3600.0)
    assert frame.loc[0, "time_days"] == pytest.approx(90000.0 / 86400.0)
    assert frame.loc[0, "day_index"] == math.floor(90000.0 / 86400.0)
    assert frame.loc[0, "hour"] == pytest.approx((90000.0 % 86400) / 3600.0)
    assert frame.loc[0, "hour_sin"] == pytest.approx(math.sin(2 * math.pi * frame.loc[0, "hour"] / 24.0))
    assert frame.loc[0, "hour_cos"] == pytest.approx(math.cos(2 * math.pi * frame.loc[0, "hour"] / 24.0))


def test_valid_request_returns_prediction_without_class(transaction_payload) -> None:
    response = create_app().test_client().post("/api/predict", json=transaction_payload)

    assert response.status_code == 200
    body = response.get_json()
    assert body["success"] is True
    assert body["metadata"]["feature_count"] == 37
    assert body["metadata"]["inference_mode"] == "frozen_model"
    assert 0.0 <= body["prediction"]["raw_probability"] <= 1.0
    assert 0.0 <= body["prediction"]["calibrated_probability"] <= 1.0
    assert 0 <= body["prediction"]["risk_score"] <= 100
    assert body["prediction"]["calibration_method"] == "platt"
    assert "C:\\" not in response.get_data(as_text=True)
    assert body["explanation"]["available"] in (True, False)


@pytest.mark.parametrize("missing", ["V1", "Amount", "Time"])
def test_missing_required_field_returns_400(transaction_payload, missing) -> None:
    transaction_payload.pop(missing)

    response = create_app().test_client().post("/api/predict", json=transaction_payload)

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "VALIDATION_ERROR"


def test_non_numeric_nan_and_infinite_values_return_400(transaction_payload) -> None:
    client = create_app().test_client()
    for field, value in [("Amount", "ten"), ("Amount", float("nan")), ("Time", float("inf"))]:
        payload = dict(transaction_payload)
        payload[field] = value
        response = client.post("/api/predict", json=payload)
        assert response.status_code == 400
        assert response.get_json()["error"]["code"] == "VALIDATION_ERROR"


def test_malformed_json_returns_400() -> None:
    response = create_app().test_client().post(
        "/api/predict", data="not-json", content_type="application/json"
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize(
    ("score", "expected"),
    [(53, "LOW_RISK"), (54, "REVIEW"), (87, "REVIEW"), (88, "HIGH_RISK"), (93, "HIGH_RISK"), (94, "CRITICAL")],
)
def test_operational_thresholds(score, expected) -> None:
    assert determine_risk_level(score) == expected
