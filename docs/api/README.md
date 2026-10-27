# API documentation

The active FastAPI adapter is implemented under `backend/app/` and currently exposes:

- `GET /health`
- `GET /api/v1/model`
- `GET /api/v1/system/status`
- `POST /api/v1/predict`

See `backend/README.md` for the current request and response shape. The frontend is not connected yet; frontend integration is a later task.
