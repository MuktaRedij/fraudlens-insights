"""Health response schemas."""

from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    artifacts: dict[str, Any] = Field(default_factory=dict)
    prediction_api: str
