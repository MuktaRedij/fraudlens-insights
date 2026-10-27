"""Health, model metadata, and runtime status endpoints."""

from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse

from ...services.inference_service import InferenceService

router = APIRouter()


def _service(request: Request) -> InferenceService:
    return request.app.state.inference_service


@router.get("/health")
def health(request: Request) -> JSONResponse:
    service = _service(request)
    details = service.status()
    details["service"] = "fraudlens-fastapi"
    code = status.HTTP_200_OK if service.ready else status.HTTP_503_SERVICE_UNAVAILABLE
    if code == status.HTTP_503_SERVICE_UNAVAILABLE:
        details["error"] = "service_not_ready"
        details["message"] = "Inference service is not ready."
    return JSONResponse(status_code=code, content=details)


@router.get("/api/v1/model")
def model_info(request: Request) -> dict[str, object]:
    return _service(request).model_info()


@router.get("/api/v1/system/status")
def system_status(request: Request) -> dict[str, object]:
    return _service(request).status()
