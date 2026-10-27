"""FastAPI adapter for the frozen fraud_model_v1 deployment.

Development command (from ``backend``):
    python -m uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from .core.config import (
    BACKEND_ROOT,
    DEFAULT_FRONTEND_ORIGINS,
    LOG_LEVEL,
    get_frontend_origins,
)
from .api.routes.health import router as health_router
from .api.routes.predict import router as predict_router
from .services.inference_service import InferenceUnavailableError, inference_service

logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

# Preserve legacy internal reference
_frontend_origins = get_frontend_origins


def create_app(service: InferenceService | None = None) -> FastAPI:
    service_instance = service or inference_service

    @asynccontextmanager
    async def app_lifespan(application: FastAPI) -> AsyncIterator[None]:
        # One engine owns process-local chronological state. Multi-worker deployment
        # requires centralized state and cross-worker concurrency control.
        application.state.inference_service = service_instance
        service_instance.initialize()
        if not service_instance.initialized:
            logger.error("FastAPI started with inference service not ready")
        yield

    application = FastAPI(
        title="FraudLens Inference API",
        version="1.0.0",
        lifespan=app_lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=_frontend_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.include_router(health_router)
    application.include_router(predict_router)

    @application.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        errors = [
            {
                "field": ".".join(str(part) for part in error.get("loc", ())),
                "message": error.get("msg", "Invalid request value."),
                "type": error.get("type", "validation_error"),
            }
            for error in exc.errors()
        ]
        logger.warning("Request validation failed: %d issue(s)", len(errors))
        return JSONResponse(
            status_code=422,
            content={"error": "validation_error", "message": "Request validation failed.", "details": errors},
        )

    @application.exception_handler(InferenceUnavailableError)
    async def inference_unavailable_handler(request: Request, exc: InferenceUnavailableError) -> JSONResponse:
        logger.error("Frozen inference service is unavailable")
        return JSONResponse(
            status_code=503,
            content={"error": "service_not_ready", "message": "Inference service is not ready."},
        )

    @application.exception_handler(StarletteHTTPException)
    async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, dict) else {}
        detail_code = detail.get("code")
        if exc.status_code == 503 or detail_code == "INFERENCE_UNAVAILABLE":
            error = "service_not_ready"
            message = "Inference service is not ready."
        elif exc.status_code == 422:
            error = "validation_error"
            message = "Request validation failed."
        else:
            error = "inference_error"
            message = detail.get("message", "Prediction could not be completed.")
        content: dict[str, object] = {"error": error, "message": message}
        if isinstance(detail.get("details"), list):
            content["details"] = detail["details"]
        return JSONResponse(status_code=exc.status_code, content=content)

    @application.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error")
        return JSONResponse(
            status_code=500,
            content={"error": "inference_error", "message": "Prediction could not be completed."},
        )

    return application


app = create_app()
