"""Raw transaction prediction route for the frozen deployment."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from ...schemas.prediction import PredictRequest, PredictionResponse
from ...services.inference_service import InferenceService, InferenceUnavailableError

logger = logging.getLogger(__name__)
router = APIRouter()


def _service(request: Request) -> InferenceService:
    return request.app.state.inference_service


@router.post("/api/v1/predict", response_model=PredictionResponse)
def predict(payload: PredictRequest, request: Request) -> dict[str, Any]:
    logger.info("Prediction request received")
    service = _service(request)
    if not service.initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "INFERENCE_UNAVAILABLE", "message": "Frozen inference service is unavailable."},
        )

    transaction = payload.transaction.model_dump()
    try:
        result = service.predict_transaction(transaction)
    except InferenceUnavailableError as exc:
        logger.error("Prediction unavailable: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "INFERENCE_UNAVAILABLE", "message": "Frozen inference service is unavailable."},
        ) from exc
    except (ValueError, TypeError) as exc:
        logger.warning("Frozen inference rejected a transaction: %s", type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "TRANSACTION_REJECTED", "message": "Transaction could not be processed in the current stream order."},
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected frozen inference failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INFERENCE_ERROR", "message": "Prediction could not be completed."},
        ) from exc

    logger.info("Prediction completed")
    return result
