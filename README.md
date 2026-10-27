# FraudLens

FraudLens is a financial fraud analytics and transaction-risk demonstration
platform. It combines:

- an active FastAPI adapter for a frozen `fraud_model_v1` LightGBM deployment;
- a stateful, chronological feature-engineering and Platt-calibration pipeline;
- a standalone React, TypeScript, and Vite dashboard for demonstrations; and
- research and verification artifacts covering model deployment and historical
  experiments.

This repository is an academic research/prototype system. It is not presented
as a production fraud decisioning service. The active API returns raw and
calibrated probabilities; the frozen package does not define an operating
threshold, so the active API does not make an approve/decline decision.

## Contents

- [What is implemented](#what-is-implemented)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Backend setup](#backend-setup)
- [API](#api)
- [Frontend setup](#frontend-setup)
- [Verification and tests](#verification-and-tests)
- [Model and data provenance](#model-and-data-provenance)
- [Limitations](#limitations)
- [Security and publication hygiene](#security-and-publication-hygiene)

## What is implemented

### Live and verified paths

- FastAPI health and service-status endpoints.
- Frozen deployment metadata at `GET /api/v1/model`.
- Raw transaction inference at `POST /api/v1/predict`.
- Pydantic validation for transaction identifiers, timestamps, and non-negative
  finite transaction amounts.
- Startup SHA-256 verification of the frozen deployment package.
- Stateful feature engineering and inference delegated to the frozen deployment
  code. The adapter does not reimplement those transformations.
- Regression and API tests under `backend/tests/` and
  `backend/ml/deployment/tests/`.

### Demonstration or limited paths

- The dashboard pages use local mock data for dashboard statistics, transaction
  lists, alerts, model-evaluation views, drift views, research views, search,
  and explanatory panels.
- The frontend analysis form is wired to the live FastAPI prediction endpoint.
- The frontend assistant is a local demonstration surface. It does not call an
  external language model.
- Dashboard numbers and historical research metrics are presentation data, not
  a claim of independently reproduced model performance.
- The legacy Flask application under `backend/legacy/flask_app/` is preserved
  for reference. It is not the active model service.

## Architecture

```text
React/Vite SPA
    |
    | POST /api/v1/predict
    v
FastAPI adapter (backend/app)
    |
    | validates deployment and delegates inference
    v
Frozen fraud_model_v1 package
    |-- production feature engineering
    |-- LightGBM model
    |-- Platt calibrator
    `-- SHA-256 and freeze manifests
```

The inference engine keeps behavioral history in process memory and requires
transactions in chronological `TransactionDT` order. Calls are serialized
within one process. It is therefore suitable for a sequential academic/demo
stream, not for uncoordinated multi-worker production serving.

## Repository layout

```text
fraudlens-insights/
├── backend/
│   ├── app/                         # Active FastAPI adapter
│   ├── ml/deployment/
│   │   ├── fraud_model_v1/          # Frozen model and calibration artifacts
│   │   ├── inference/               # Frozen feature engineering/inference code
│   │   ├── inference_tests/         # Frozen inference fixtures and summaries
│   │   └── tests/                   # Inference regression tests
│   ├── tests/api/                   # FastAPI integration tests
│   ├── legacy/flask_app/            # Reference-only Flask implementation
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/routes/                  # TanStack Router SPA routes
│   ├── src/services/api.ts          # Live prediction call plus mock adapters
│   ├── src/data/mock-data.ts        # Dashboard/demo data
│   ├── package.json
│   └── README.md
├── data/
│   └── processed/                   # Research outputs; raw data is local-only
├── docs/                            # Audits, reports, and project documentation
├── scripts/
│   ├── verify_deployment.py         # Frozen artifact checksum verification
│   └── test_spa_routes.py           # Vite preview route audit
└── README.md
```

## Prerequisites

- Windows PowerShell examples below assume Python is installed and the
  repository is at `C:\Users\Mukta\Downloads\fraudlens-insights`.
- Python 3.10 or newer.
- Node.js 18 or newer and npm.
- The frozen model files under
  `backend/ml/deployment/fraud_model_v1/`.

Do not commit virtual environments, `.env` files, raw datasets, caches, or
frontend build output.

## Backend setup

Create a backend virtual environment and install the pinned dependency ranges:

```powershell
Set-Location C:\Users\Mukta\Downloads\fraudlens-insights\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Copy [backend/.env.example](backend/.env.example) to `backend/.env` only when
local overrides are needed. The template contains placeholders and local
development values; never put credentials in a committed environment file.

Start the active FastAPI service from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The service loads `fraud_model_v1` from its repository-local default directory.
Set `FRAUD_DEPLOYMENT_DIR` to use another deployment directory. Set
`FRONTEND_ORIGINS` to override the comma-, semicolon-, or newline-separated CORS
origins. `LOG_LEVEL` controls application logging.

## API

### `GET /health`

Returns service and frozen-engine readiness. A service that cannot verify or
load the deployment returns HTTP 503 with a degraded status.

### `GET /api/v1/model`

Returns frozen model metadata, including model version, model type, feature
count, calibration method, calibration input transform, and freeze status.

### `GET /api/v1/system/status`

Returns runtime flags for deployment integrity, feature engineering, model, and
calibrator loading.

### `POST /api/v1/predict`

Request body:

```json
{
  "transaction": {
    "TransactionID": "demo-1001",
    "TransactionDT": 86400,
    "TransactionAmt": 125.5
  }
}
```

`TransactionID` may be a non-empty string or integer. `TransactionDT` and
`TransactionAmt` must be finite numeric values, and `TransactionAmt` must not
be negative. Additional raw transaction fields are accepted and passed to the
frozen feature engineer.

Successful response:

```json
{
  "model_version": "fraud_model_v1",
  "transaction_id": "demo-1001",
  "raw_probability": 0.0123,
  "calibrated_fraud_probability": 0.0087
}
```

The numeric values above are illustrative response shape only, not a reported
performance result. A request that violates the current chronological stream
or cannot be processed returns an explicit error. Validation failures return
HTTP 422; unavailable inference returns HTTP 503.

## Frontend setup

Install and run the standalone SPA:

```powershell
Set-Location C:\Users\Mukta\Downloads\fraudlens-insights\frontend
npm install
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`.
`VITE_API_BASE_URL` controls the FastAPI base URL and defaults to
`http://localhost:8000`. Configure it in a local `frontend/.env`; do not place
secrets in Vite client environment variables.

Available routes include:

| Route | Purpose |
| --- | --- |
| `/` | Application landing page |
| `/dashboard` | Demonstration dashboard |
| `/analyze` | Transaction analysis form using the live prediction API |
| `/transactions` | Demonstration transaction list |
| `/transactions/:id` | Demonstration transaction detail |
| `/alerts` | Demonstration alert queue |
| `/models` | Demonstration model intelligence |
| `/explainability` | Demonstration explanation view |
| `/drift` | Demonstration drift view |
| `/research` | Demonstration research metrics |
| `/settings` | Demonstration settings |

For production builds:

```powershell
npm run typecheck
npm run lint
npm run build
npm run preview
```

Because this is a client-side SPA, a deployed static host must rewrite nested
routes to `index.html`. See [frontend/README.md](frontend/README.md) for
Nginx, Caddy, Netlify, and Vercel examples.

## Verification and tests

Run frozen deployment checksum verification from the repository root:

```powershell
.\backend\.venv\Scripts\python.exe scripts\verify_deployment.py
```

Run active FastAPI tests:

```powershell
Set-Location C:\Users\Mukta\Downloads\fraudlens-insights\backend
.\.venv\Scripts\python.exe -m pytest tests\api -v
```

Run the inference regression tests:

```powershell
.\.venv\Scripts\python.exe -m pytest ml\deployment\tests -v
```

The SPA route audit expects a running Vite preview server on port 4173:

```powershell
Set-Location C:\Users\Mukta\Downloads\fraudlens-insights\frontend
npm run build
npm run preview -- --host 127.0.0.1
```

In another PowerShell window:

```powershell
Set-Location C:\Users\Mukta\Downloads\fraudlens-insights
python scripts\test_spa_routes.py
```

## Model and data provenance

The active deployment is `fraud_model_v1`:

- Base experiment: E3.
- Model: LightGBM.
- Feature count: 22.
- Calibration: E7 Platt scaling.
- Calibration input: the logit of the raw probability.
- Output: raw probability and calibrated fraud probability.
- Integrity: deployment checksum and freeze manifests are verified before load.

The package README contains historical validation figures associated with the
deployment artifacts. Those figures have not been independently reproduced
from the available repository artifacts and should not be treated as a new
benchmark claim.

The repository also contains processed research outputs for PaySim, IEEE-CIS,
and Credit Card Fraud experiments. Raw source datasets are intentionally kept
out of the publication inventory because of size, provenance, licensing, and
potential privacy concerns. Confirm redistribution rights before publishing
any processed or derived artifact.

## Limitations

- No authentication, authorization, persistence, analyst feedback workflow, or
  production decisioning policy is implemented.
- The active inference engine owns chronological behavioral state in one
  process. State is lost on restart and is not shared across workers.
- The API does not expose SHAP values or a finalized risk threshold.
- Several dashboard pages are mock/demo surfaces and do not represent live
  backend data.
- The legacy Flask code is retained for historical reference and is not the
  active inference path.
- Model performance and historical evaluation claims require independent
  reproduction before being used as production or scientific evidence.

## Security and publication hygiene

- Never commit `.env` files, credentials, private keys, access tokens, or
  personal transaction records.
- Keep Python virtual environments, `node_modules`, caches, logs, and build
  output out of Git.
- Treat frozen model artifacts and checksum manifests as immutable.
- Review dataset licenses and privacy implications before redistribution.
- Rotate any credential immediately if one is ever exposed in Git history;
  adding a pattern to `.gitignore` does not remove historical exposure.

For backend-specific notes, see [backend/README.md](backend/README.md). For
frontend-specific notes, see [frontend/README.md](frontend/README.md).
