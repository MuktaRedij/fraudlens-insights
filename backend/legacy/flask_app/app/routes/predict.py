"""Prediction endpoint for the frozen FraudLens model."""

from __future__ import annotations

from flask import Blueprint, jsonify, request
from pydantic import ValidationError

from ..schemas.prediction import RawTransaction
from ..services.model_loader import ArtifactError
from ..services.prediction_service import InferenceError, PredictionService

predict_bp = Blueprint("predict", __name__)
_prediction_service = PredictionService()


def _error(code: str, message: str, details: object | None = None) -> tuple[object, int]:
    body: dict[str, object] = {"error": {"code": code, "message": message}}
    if details is not None:
        body["error"]["details"] = details  # type: ignore[index]
    return jsonify(body), 400 if code == "VALIDATION_ERROR" else 500


@predict_bp.post("/predict")
def predict() -> tuple[object, int]:
    """Validate one raw transaction and return frozen-model inference."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return _error("VALIDATION_ERROR", "Request body must be valid JSON object.")
    try:
        transaction = RawTransaction.model_validate(payload)
    except ValidationError as exc:
        details = [
            {"field": ".".join(str(part) for part in error["loc"]), "message": error["msg"]}
            for error in exc.errors()
        ]
        return _error("VALIDATION_ERROR", "Request contains invalid transaction fields.", details)

    try:
        result = _prediction_service.predict(transaction.model_dump())
    except ArtifactError:
        return _error("MODEL_UNAVAILABLE", "Frozen model artifacts are unavailable or incompatible.")
    except InferenceError:
        return _error("INFERENCE_ERROR", "Frozen model inference could not be completed safely.")
    return jsonify(result.as_dict()), 200
