# FraudLens backend

The backend contains the active FastAPI adapter in `app/` and a preserved legacy Flask application in `legacy/flask_app/`. The frozen deployment is under `ml/deployment/`; the Flask application is not the active fraud inference backend.

## Current status

Implemented:

- FastAPI health, model metadata, system status, and prediction endpoints in `app/`.
- Legacy Flask application factory and `/api/health` under `legacy/flask_app/app/`.
- SQLAlchemy and Flask-Migrate extension wiring, without database tables or PostgreSQL connection work.
- Legacy loader code for the historical `20F_smote_lightgbm.txt` LightGBM model and 37-feature metadata. Those legacy artifacts are absent from the current repository.
- Frozen deployment integrity validation and FastAPI integration tests under `tests/api/`.

Legacy Flask notes:

- Its configured 37-feature artifacts are not present in the current repository tree.
- PostgreSQL CRUD, authentication, chat API, frontend integration, and model training remain out of scope.

## Active frozen model

The active FastAPI service loads `fraud_model_v1`, a frozen LightGBM model with a stateful, 22-feature behavioral inference pipeline and Platt calibration. The calibrator receives `logit(raw_probability)`. The deployment exposes raw and calibrated probabilities only: `threshold_config.json` has no finalized operating threshold, so the active API does not produce a risk score or decision. See [`docs/ml/frozen-model.md`](../docs/ml/frozen-model.md) for the feature and integrity contract.

The backend uses frozen deployment artifacts only. It never retrains, recalibrates, or silently substitutes a model. The 37-feature Credit Card Fraud contract described below belongs to the legacy Flask reference service, not this deployment.

## Local setup

Use Python 3.10+ in a virtual environment, then install the dependencies from `requirements.txt`:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` only if local overrides are needed. PostgreSQL is intentionally not connected in this phase.

## Start Flask locally

From the `backend` directory (legacy reference service):

```powershell
python run.py
```

The legacy Flask health endpoint is available at `http://127.0.0.1:5000/api/health`. It is reference code; use the FastAPI service below for active `fraud_model_v1` inference.

## Validation

Run focused active FastAPI tests from `backend`:

```powershell
.\.venv\Scripts\python.exe -m pytest tests\api -q
```

Legacy Flask tests are under `legacy/flask_app/tests/`. Their historical 37-feature artifact paths are not part of the active frozen deployment.

## Legacy 37-feature Flask prediction endpoint

The Flask code defines `POST /api/predict` for the older Credit Card Fraud contract containing `V1` through `V28`, `Amount`, and `Time`. `Class` is a training target and is not required. Its configured model/calibrator/metadata paths are not present in the current repository, so this legacy endpoint is not the active deployable model path.

The endpoint reproduces the authoritative notebook feature engineering:

- `log_amount = log1p(Amount)`
- `time_hours = Time / 3600.0`
- `time_days = Time / 86400.0`
- `day_index = floor(Time / 86400.0)`
- `hour = (Time % 86400) / 3600.0`
- `hour_sin = sin(2π × hour / 24.0)`
- `hour_cos = cos(2π × hour / 24.0)`

No scaling, PCA, encoding, imputation, or SMOTE is performed during inference. The frozen SMOTE-trained LightGBM model produces the raw probability, then the frozen Platt calibrator receives `logit(raw_probability)`. The risk score is `round(calibrated_probability * 100)`, with decisions at 54 / 88 / 94.

Safe example request:

```json
{
	"V1": 0.0, "V2": 0.0, "V3": 0.0, "V4": 0.0, "V5": 0.0,
	"V6": 0.0, "V7": 0.0, "V8": 0.0, "V9": 0.0, "V10": 0.0,
	"V11": 0.0, "V12": 0.0, "V13": 0.0, "V14": 0.0, "V15": 0.0,
	"V16": 0.0, "V17": 0.0, "V18": 0.0, "V19": 0.0, "V20": 0.0,
	"V21": 0.0, "V22": 0.0, "V23": 0.0, "V24": 0.0, "V25": 0.0,
	"V26": 0.0, "V27": 0.0, "V28": 0.0, "Amount": 10.0, "Time": 3600.0
}
```

The response contains raw and calibrated probabilities, a 0–100 score, the operational decision, frozen model metadata, and a truthful SHAP explanation status. V1–V28 remain anonymized/PCA-derived and are not assigned business meanings.

## Frozen `fraud_model_v1` FastAPI adapter

The new FastAPI application is separate from Flask and delegates raw transaction inference to the frozen package under `ml/deployment/fraud_model_v1/`. It does not recreate features, calibration, thresholds, or predictions.

From the `backend` directory, install `requirements.txt` in the backend virtual environment and start the adapter with:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Endpoints:

- `GET /health`
- `GET /api/v1/model`
- `GET /api/v1/system/status`
- `POST /api/v1/predict`

`POST /api/v1/predict` accepts a raw transaction object containing `TransactionID`, `TransactionDT`, and `TransactionAmt`; other raw fields are passed through to the frozen feature engineer. The response is limited to the frozen outputs: model version, transaction ID, raw probability, and calibrated fraud probability.

Set `FRAUD_DEPLOYMENT_DIR` to override the deployment directory. Relative overrides resolve from the repository root. `FRONTEND_ORIGINS` accepts comma-, semicolon-, or newline-separated development origins; defaults are localhost ports 3000, 5173, 8080, and 8081.
The FastAPI application loads optional values from `backend/.env` before creating the process-wide inference service. Copy `.env.example` to `.env` only for local overrides.

### Integrity verification and stateful inference limitation

At startup the adapter requires `checksums_sha256.json` and verifies each entry under its `deployment_files` map with SHA-256 before loading the inference engine. Missing entries/files, unreadable files, checksum mismatches, or a non-passing freeze status leave the service degraded and health returns HTTP 503.

One process-local `IntegratedFraudInference` engine is initialized at application startup. Its `ProductionFeatureEngineer` stores behavioral history in memory, and calls are serialized inside that process. State is lost on restart and is not shared among multiple processes or workers. This is suitable only for a sequential academic/demo stream. A production multi-worker deployment requires durable centralized state, transaction ordering, idempotency, and concurrency/locking control. Redis/PostgreSQL state coordination is not implemented.

Transactions must arrive in chronological `TransactionDT` order. The frozen feature engineer rejects an out-of-order timestamp. Multiple workers would each have independent in-memory history; production multi-worker serving therefore requires centralized state plus cross-worker concurrency and ordering controls.
