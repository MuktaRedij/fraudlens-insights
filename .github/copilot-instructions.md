# FraudLens repository guidance

- Frontend application source and its Node configuration live under `frontend/`.
- The active API is FastAPI under `backend/app/`; do not use the legacy Flask app as the active model service.
- Legacy Flask code is preserved under `backend/legacy/flask_app/`.
- Frozen `fraud_model_v1` files under `backend/ml/deployment/` are immutable. Do not edit, move, rename, regenerate, or retrain them without explicit authorization.
- The frozen inference pipeline owns stateful feature engineering, LightGBM inference, and Platt calibration. Do not reimplement these transformations in the frontend or adapter.
- Do not add risk scoring, decisions, persistence, authentication, SHAP, or frontend API wiring without explicit task scope.
- Keep local `.env`, virtual environments, raw datasets, generated caches, and build output out of Git.
