# FraudLens model and prediction pipeline validation

**Validation date:** 2026-10-12  
**Scope:** Active FastAPI service, frozen `fraud_model_v1`, Analyze-page integration, and available evaluation data.

## Summary

The frozen model and inference modules passed the repository's SHA-256 integrity checks and loaded successfully in the active FastAPI service. The API regression suite passed **19/19 tests**. The Analyze page was exercised against the running API and displayed the live response; it also displayed service and network errors when those conditions were deliberately simulated in the browser.

These results establish software and integration behavior, not fraud-detection quality or production readiness. No compatible independent held-out labeled test data and evaluation runner were available, and no fresh model-quality metrics were measured. No operational decision threshold is configured.

## Environment and commands

- Windows; `.venv-1\Scripts\python.exe` was the available Python 3.10.11 environment with the required backend and test dependencies. The separate `.venv` did not contain pytest and most backend dependencies. No dependencies were installed.
- Frontend commands were run from `frontend\`; Python commands were run from the repository root unless otherwise noted.

Commands executed:

```powershell
.\.venv-1\Scripts\python.exe scripts\verify_deployment.py
.\.venv-1\Scripts\python.exe -m pytest backend\tests\api\test_frozen_inference_api.py -q
.\.venv-1\Scripts\python.exe -m pytest backend\tests\api -q
.\.venv-1\Scripts\python.exe -m pytest backend\ml\deployment\tests\test_inference_regression.py -q
npm run typecheck
npm run lint
npm run build
```

The active API was started from `backend\` with:

```powershell
..\.venv-1\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The frontend was served with `npm run dev -- --host 127.0.0.1` from `frontend\`. The browser used `http://localhost:5173/analyze` so that its origin matched the backend's default CORS allowlist.

## Frozen artifact integrity and runtime

`scripts\verify_deployment.py` passed before and after implementation changes. It verified all **11 deployment artifact** checksums against the existing trusted manifest, the two frozen inference-module checksums, and the manifest-protected regression-test file. The verifier was run against the checked-in manifest; the manifest was not regenerated.

The final live FastAPI process initialized successfully and reported `fraud_model_v1`. `GET /health`, `GET /api/v1/model`, and `GET /api/v1/system/status` returned successful responses. The model endpoint reported LightGBM, 22 features, Platt scaling, and `status: frozen`; readiness reported integrity verification, model loading, feature-engineering loading, and calibrator loading as successful.

The existing API tests also exercise degraded readiness for missing/tampered frozen artifacts. Health distinguishes API degradation from model readiness in those cases; an unavailable or unverified model does not report ready.

**Frozen files changed:** No frozen model artifacts, inference modules, trusted checksums, or frozen regression-test files were edited. Final integrity verification passed.

## Backend regression and prediction-pipeline checks

| Suite | Result |
|---|---:|
| Initial required `test_frozen_inference_api.py` run | 17 passed |
| Final `backend\tests\api` run, including added runtime tests | **19 passed** in 67.84 seconds |
| Separate frozen inference regression suite | 3 setup errors; see below |

The three errors in `backend\ml\deployment\tests\test_inference_regression.py` occur during setup because the test defaults to `/content/drive/MyDrive/fraud-detection-platform` and cannot import `integrated_inference` from this Windows checkout. The actual exception is `ModuleNotFoundError: No module named 'integrated_inference'`. That immutable test is itself covered by the integrity manifest and was not changed. Its baseline was not run before this task's edits, so whether the setup failure predated this work was not independently established.

The final API test suite includes functional tests using explicitly synthetic transactions for:

- A card with no observed history followed by requests with prior history, including repeated requests.
- Eight simultaneous requests sharing the same entity and timestamp; calls are serialized and history counts remain consistent.
- Finite raw and calibrated probabilities within `[0, 1]` and the expected `fraud_model_v1` response version.
- A simulated inference runtime exception returning a generic HTTP 500 response without the injected exception text.

Existing API tests cover missing required fields, non-numeric, negative, NaN, and infinite values, model metadata, readiness, and integrity-failure behavior. The synthetic records and outputs above are software-functionality checks only; they are not model-performance evidence.

The feature engineer is chronological and stateful. It adds the current transaction only after feature construction, rejects out-of-order `TransactionDT`, serializes access within one process, and loses its in-memory history on restart. History is not shared across multiple workers. Durable cross-worker state, ordering, and idempotency remain necessary for production multi-worker operation.

## Live API and frontend integration

The active routes were confirmed as `/health`, `/api/v1/model`, `/api/v1/system/status`, and `/api/v1/predict`. In a cleanly restarted server process, the Analyze page submitted a synthetic raw transaction and displayed the actual live response:

- Model version: `fraud_model_v1`
- Raw probability: `0.6138560785463903`
- Calibrated fraud probability: `0.10035947547712375`
- Decision: **Not configured**

The API payload captured from the Analyze form contained `TransactionID`, raw numeric `TransactionDT`, and `TransactionAmt`; it did not contain PCA-style `V1`–`V28` features or amount-derived identity fields. The displayed response used the API model version and probabilities. Browser checks also confirmed that a simulated HTTP 503 and an aborted network request produce visible error alerts. The simulated failure/aborted request tested UI error handling; it was not an inference-service outage.

Frontend commands, run from `frontend\`:

- `npm run typecheck` — passed.
- `npm run lint` — exit code 0; six Fast Refresh warnings in existing UI component files, no lint errors.
- `npm run build` — passed.

The Analyze workflow uses `VITE_API_BASE_URL` (default `http://localhost:8000`), submits the real FastAPI request contract, and has no heuristic prediction fallback. Other dashboard/research surfaces still contain mock/demo data; their figures are not live model results.

## Model quality and data provenance

No suitable, compatible, independent held-out labeled dataset and reproducible evaluation script were available to measure model quality in this run:

- `data/raw` contained no raw source dataset.
- Available Credit Card Fraud evaluation outputs describe the older 37-feature `V1`–`V28` contract, not the current 22-feature behavioral model.
- Available IEEE-CIS audit/evaluation artifacts describe a different feature pipeline (including E1/399-feature outputs) or historical artifacts, not a reproducible independent test of the deployed 22-feature pipeline.
- No compatible held-out labels and evaluation runner were identified. Parquet readers were also unavailable in the selected environment; no package was installed because the required compatible test data/protocol was not established.

Accordingly, no fresh PR-AUC / average precision, ROC-AUC, precision, recall, F1, Brier score, calibration error, or confusion matrix is reported.

The frozen `model_metadata.json` contains historical experiment/validation values: calibrated PR-AUC `0.164383`, ROC-AUC `0.762803`, Brier score `0.030997`, and 10-bin ECE `0.006222`. The metadata identifies these as E3/E7 validation results, with 472,432 training rows and 118,108 validation rows. They were not recomputed here and are not an independent held-out test result; do not interpret them as newly measured performance.

`threshold_config.json` reports `status: not_finalized` and `default_threshold: null`. Thus threshold-specific precision/recall, F1, and confusion-matrix metrics cannot be calculated for a deployed operating point. Choosing a threshold requires a documented operating-point policy and suitable validation data; it must not be inferred from this validation run.

## Frontend/pipeline corrections made

- Replaced calendar-to-Unix conversion with the raw numeric, dataset-relative `TransactionDT` contract and removed fabricated amount-derived identity fields from the Analyze request.
- Removed locally invented risk bands, decisions, and SHAP content from the live prediction result. The page now labels decisions as unconfigured and displays only API-returned probabilities/version.
- Added response probability validation and visible request/validation/network errors.
- Added synthetic runtime regression tests for history handling, repeated/concurrent calls, probability bounds, and sanitized inference failures.
- Corrected backend and architecture documentation that described the active model as a 37-feature/thresholded model or said the Analyze page was not connected.

## Remaining limitations and next steps

1. Obtain an authorized, provenance-documented, independent labeled test set compatible with the frozen 22-feature pipeline, plus a reproducible evaluation protocol. Preserve chronological separation and document leakage controls before reporting test metrics.
2. Resolve the frozen regression suite's hard-coded Linux/Colab project root without editing its checksum-protected test file (for example, use a supported environment/configuration that provides the expected path).
3. Define and validate an operational decision threshold separately; the current model API intentionally returns probabilities only.
4. Treat the current process-local state as a demo/single-process limitation until durable shared history, ordering, idempotency, and cross-worker concurrency behavior are designed and tested.

Passing regression, build, integrity, and browser checks support software correctness and local operational readiness only. They do not demonstrate that the model detects fraud accurately or that the service is ready for production traffic.
