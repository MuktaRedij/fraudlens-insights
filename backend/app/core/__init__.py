"""Core configuration and settings for the FraudLens FastAPI backend."""

from .config import (
    BACKEND_ROOT,
    DEFAULT_FRONTEND_ORIGINS,
    LOG_LEVEL,
    get_frontend_origins,
)

__all__ = [
    "BACKEND_ROOT",
    "DEFAULT_FRONTEND_ORIGINS",
    "LOG_LEVEL",
    "get_frontend_origins",
]
