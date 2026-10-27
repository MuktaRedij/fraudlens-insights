# FraudLens Insights — Agent Instructions

## Overview
This repository contains the **FraudLens** financial fraud analytics and detection platform.

## Key Invariants
- **Frozen ML Artifacts**: `backend/ml/deployment/fraud_model_v1/` is immutable. Never retrain, modify, or regenerate model weights, calibration artifacts, or checksums.
- **Active Backend**: The active API service is FastAPI under `backend/app/`. The legacy Flask app under `backend/legacy/flask_app/` is strictly for reference.
- **Frontend Architecture**: Standalone React + TypeScript + Vite SPA under `frontend/` using TanStack Router, Tailwind CSS, and Radix UI components.
- **Security & Hygiene**: Keep local virtual environments, `.env` files, build caches, and datasets out of Git.
