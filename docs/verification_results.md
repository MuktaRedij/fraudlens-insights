# FraudLens — Verification Results

**Verification date:** 2026-10-25  
**Repository:** `C:\Users\Mukta\Downloads\fraudlens-insights`

This document records commands actually executed during the final audit. Results are
separated so failed, skipped, and unverified checks are not reported as passing.

## Passed

| Check | Command | Result |
|---|---|---|
| Active FastAPI tests | `.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests\api -v` | **19 passed**, exit code 0, 41.22 seconds |
| Frontend production build | From `frontend\`: `npm run build` | **Passed**, exit code 0 |
| Frontend TypeScript check | From `frontend\`: `npm run typecheck` | **Passed**, exit code 0 |
| Frontend lint | From `frontend\`: `npm run lint` | **Passed**, exit code 0; 0 errors, 6 warnings |
| Frozen deployment verification | `.\backend\.venv\Scripts\python.exe .\scripts\verify_deployment.py` | **Passed**; 11 deployment files, 2 inference files, and regression-test hash matched |
| Live API health | `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health` | **HTTP 200**; runtime ready, model/calibrator/feature engineering loaded |
| Live API prediction | `POST http://127.0.0.1:8000/api/v1/predict` with `FACULTY-DEMO-002`, `12192900`, `125.4` | **HTTP 200**; returned `fraud_model_v1`, matching transaction ID, raw and calibrated probabilities |
| Live frontend route | `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/analyze` | **HTTP 200** |
| Live browser Analyze flow | Opened `http://127.0.0.1:5173/analyze` and submitted `TX-1001` | **Passed after CORS fix**; displayed actual API response and `Decision: Not configured` |
| Live browser empty amount validation | Cleared Amount and submitted | **Passed**; displayed `Transaction amount is required.` |

The live prediction observed during the API probe was:

```json
{
  "model_version": "fraud_model_v1",
  "transaction_id": "FACULTY-DEMO-002",
  "raw_probability": 0.3207294058142267,
  "calibrated_fraud_probability": 0.0382228024562647
}
```

This is an integration output, not a model-accuracy measurement.

## Failed

| Check | Command | Result and cause |
|---|---|---|
| Protected inference regression suite | `.\backend\.venv\Scripts\python.exe -m pytest .\backend\ml\deployment\tests\test_inference_regression.py -q` | **3 setup errors**, exit code 1. The protected test uses a hard-coded external artifact root derived from `/content/drive/MyDrive/fraud-detection-platform`; `integrated_inference` cannot be imported from this checkout. |
| Initial browser request from `127.0.0.1` | Submit Analyze before the fix | Failed CORS preflight because `http://127.0.0.1:5173` was missing from backend defaults. Fixed by adding loopback origins to [`backend/app/core/config.py`](../backend/app/core/config.py) and [`backend/.env.example`](../backend/.env.example). |

## Skipped or unavailable

- No browser test of stale-request ordering was claimed as an automated end-to-end result.
  The request-generation guard is implemented in [`analyze-page.tsx`](../frontend/src/components/pages/analyze-page.tsx)
  and the backend suite covers serialized stateful inference, but a dedicated browser
  timing test was not run.
- No independent model-quality evaluation was run. The original evaluation runner,
  exact split records, source-data hash, and end-to-end evaluation report are unavailable.
- The protected regression test was not modified or bypassed.

## Warnings and limitations

- Frontend lint produced six existing Fast Refresh warnings and no errors.
- Vite emitted an advisory about using native TypeScript path resolution instead of
  `vite-tsconfig-paths`.
- The active model threshold is not finalized; no decision or risk score is verified.
- Several non-Analyze frontend surfaces use mock/demo data.
- Stateful feature history is process-local, chronological, lost on restart, and not
  coordinated across multiple workers.

## Protected-file status

The following protected model, inference, regression-test, checksum, and freeze-manifest
paths were not edited:

- `backend/ml/deployment/inference/integrated_inference.py`
- `backend/ml/deployment/inference/production_feature_engineering.py`
- `backend/ml/deployment/fraud_model_v1/`
- `backend/ml/deployment/tests/test_inference_regression.py`
- `checksums_sha256.json`
- `deployment_freeze_manifest.json`

