# FraudLens system overview

## Intended active architecture

```text
Standalone React/Vite SPA frontend
        ↓ (Analyze page; `VITE_API_BASE_URL`)
FastAPI application (`backend/app`)
        ↓
Inference service (`backend/app/services/inference_service.py`)
        ↓
Frozen `IntegratedFraudInference`
        ↓
Frozen `ProductionFeatureEngineer` → exact 22-feature schema
        ↓
Frozen LightGBM `fraud_model_v1` → raw probability
        ↓
Frozen Platt calibrator on `logit(raw_probability)`
        ↓
Calibrated fraud probability
```

The FastAPI service is the active backend entry point. It exposes health, model metadata, system status, and prediction routes. It delegates feature engineering, model prediction, and calibration to the frozen deployment package; it does not implement those operations itself.

## Current frontend connection

The Analyze page in `frontend/` submits raw transactions to `POST /api/v1/predict` and displays the model version and raw/calibrated probabilities returned by FastAPI. It sends the raw transaction time and amount, with optional behavioral identifiers; feature engineering remains inside the frozen backend package. No decision threshold is configured. Other dashboard and research surfaces still contain demo/mock data and are not evidence of live model performance.

## Legacy Flask application

`backend/legacy/flask_app/` contains the preserved Flask application, including its older 37-feature Credit Card Fraud model adapter. It is reference/legacy code and is not the active fraud inference backend. Its configured model artifacts are absent from the active repository tree.

## Inference state

The production feature engineer maintains process-local chronological transaction history. The demo adapter uses one in-memory inference engine and serializes prediction calls within a process. State resets on restart; separate workers do not share history. Production multi-worker operation requires centralized state, transaction ordering, and concurrency control.
