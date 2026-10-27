"""Health and artifact-readiness endpoints."""

from flask import Blueprint, current_app, jsonify

from ..schemas.health import HealthResponse
from ..services.model_loader import FrozenModelLoader

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health() -> tuple[object, int]:
    """Report application and frozen-artifact readiness without predicting."""
    loader = FrozenModelLoader.from_config(current_app.config)
    response = HealthResponse(
        status="ok",
        service="fraudlens-backend",
        artifacts=loader.artifact_status(),
        prediction_api="not implemented",
    )
    return jsonify(response.model_dump()), 200
