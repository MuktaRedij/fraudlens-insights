"""Application configuration and environment settings for the FraudLens backend."""

from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")

DEFAULT_FRONTEND_ORIGINS = (
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://localhost:8081",
)


def get_frontend_origins() -> list[str]:
    """Parse configured frontend CORS origins from environment."""
    configured = os.getenv("FRONTEND_ORIGINS")
    if not configured:
        return list(DEFAULT_FRONTEND_ORIGINS)
    return [
        origin.strip()
        for origin in configured.replace(";", ",").replace("\n", ",").split(",")
        if origin.strip()
    ]


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
FRAUD_DEPLOYMENT_DIR = os.getenv("FRAUD_DEPLOYMENT_DIR", "")
