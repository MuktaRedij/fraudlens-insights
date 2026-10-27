# FraudLens — Faculty Project Report

**Audit date:** 2026-10-25  
**Repository:** `MuktaRedij/fraudlens-insights`  
**Purpose:** Evidence-based summary of what is implemented, what was executed successfully, and what remains unverified.

## 1. Executive conclusion

FraudLens is an implemented academic demonstration system with:

- a standalone React/TypeScript/Vite frontend;
- an active FastAPI backend;
- a frozen `fraud_model_v1` LightGBM deployment;
- stateful 22-feature behavioral feature engineering; and
- Platt-calibrated fraud probabilities.

The software integration is working in this checkout. The active FastAPI test suite passed **19/19 tests**, the frontend built and type-checked successfully, frontend lint completed with **zero errors and six warnings**, and frozen deployment integrity verification passed for all protected entries.

The evidence does **not** establish production readiness or independently reproduce the historical model-evaluation results. The active API returns raw and calibrated probabilities only. The operational threshold is explicitly not finalized, so the active API does not produce a verified fraud decision or risk score. Dashboard, research, alert, and explanation surfaces remain partly demo/mock-data driven.

The appropriate faculty-level conclusion is:

> FraudLens is a functioning, testable academic fraud-analysis application demonstrating model-serving integration and reliability controls. Its historical model-quality figures and production decision policy remain evidence limitations, not verified current claims.

## 2. Implemented system

| Area | Audited status | Evidence |
|---|---|---|
| Frontend | Implemented React + TypeScript + Vite SPA | [`frontend/package.json`](../frontend/package.json), [`frontend/src/`](../frontend/src/) |
| Active backend | Implemented FastAPI service | [`backend/app/main.py`](../backend/app/main.py) |
| Prediction route | Implemented `POST /api/v1/predict` | [`backend/app/api/routes/predict.py`](../backend/app/api/routes/predict.py) |
| Health and metadata | Implemented `/health`, `/api/v1/model`, and `/api/v1/system/status` | [`backend/app/api/routes/health.py`](../backend/app/api/routes/health.py) |
| Model deployment | Frozen LightGBM `fraud_model_v1`, 22-feature contract | [`backend/ml/deployment/fraud_model_v1/`](../backend/ml/deployment/fraud_model_v1/) |
| Feature engineering | Stateful behavioral feature engineering delegated to the frozen package | [`backend/ml/deployment/inference/production_feature_engineering.py`](../backend/ml/deployment/inference/production_feature_engineering.py) |
| Calibration | Frozen Platt calibration applied to `logit(raw_probability)` | [`backend/ml/deployment/inference/integrated_inference.py`](../backend/ml/deployment/inference/integrated_inference.py) |
| Frontend prediction integration | Analyze flow calls the active API and validates the response contract | [`frontend/src/services/api.ts`](../frontend/src/services/api.ts) |
| Legacy Flask service | Preserved reference implementation, not the active model service | [`backend/legacy/flask_app/`](../backend/legacy/flask_app/) |

The frontend is not uniformly live-backed. `analyzeTransaction` uses the FastAPI endpoint, while several dashboard, research, alert, risk-policy, and explanation helpers use demo data. Those screens should be presented as interface demonstrations, not as live production analytics.

During the live browser check, the frontend initially failed when opened from
`http://127.0.0.1:5173` because that loopback origin was absent from the backend CORS
defaults. The backend allowlist was extended to include the documented `127.0.0.1`
development origins. After restarting the backend, the Analyze page displayed the
actual API response for `TX-1001`, including model version, transaction ID, raw
probability, calibrated probability, and `Decision: Not configured`.

## 3. Verification performed

All commands below were executed against the current working tree on Windows.

### Backend API tests

Command:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests\api -v
```

Result: **19 passed in 41.22 seconds**.

The passing tests cover:

- service health and readiness;
- model metadata and runtime status;
- a valid real inference request;
- finite, non-negative, and required-field validation;
- missing, tampered, or invalid deployment behavior;
- generic error responses without exception details;
- repeated and concurrent stateful predictions serialized within one process.

These tests establish software behavior. Synthetic transactions in the state and concurrency tests are not model-quality evidence.

### Frontend build, typecheck, and lint

Commands, executed from [`frontend/`](../frontend/):

```powershell
npm run build
npm run typecheck
npm run lint
```

Results:

- `npm run build`: **passed**;
- `npm run typecheck`: **passed**;
- `npm run lint`: **completed with exit code 0**;
- lint findings: **0 errors, 6 existing Fast Refresh warnings** in UI component files.

The build emitted a Vite advisory that `vite-tsconfig-paths` can be replaced by Vite's native path resolution. This is a performance/configuration advisory, not a build failure.

### Frozen deployment integrity

Command:

```powershell
.\backend\.venv\Scripts\python.exe .\scripts\verify_deployment.py
```

Result: **passed**.

The verifier matched:

- 11 frozen deployment artifact hashes;
- 2 frozen inference-module hashes; and
- the manifest-protected regression-test hash.

This verifies file integrity against the checked-in manifest. It does not prove accuracy, fairness, or current performance.

### Protected inference regression suite

Command:

```powershell
.\backend\.venv\Scripts\python.exe -m pytest .\backend\ml\deployment\tests\test_inference_regression.py -q
```

Result: **3 setup errors**.

The protected test imports `integrated_inference` from a hard-coded external artifact path derived from `/content/drive/MyDrive/fraud-detection-platform`. That path is not present in this Windows checkout, so setup fails with `ModuleNotFoundError: No module named 'integrated_inference'`. The protected test was not modified. This suite must not be reported as passed.

## 4. Model and evaluation evidence

The frozen package declares:

- model version: `fraud_model_v1`;
- model type: LightGBM;
- feature count: 22;
- calibration: Platt scaling;
- training rows: 472,432;
- validation rows: 118,108; and
- historical E3/E7 metrics in [`model_metadata.json`](../backend/ml/deployment/fraud_model_v1/model_metadata.json).

The package also contains [`E7_raw_vs_calibrated_comparison.csv`](../backend/ml/deployment/fraud_model_v1/E7_raw_vs_calibrated_comparison.csv). In this checkout it contains a header and **two data rows**, not a complete labeled 118,108-row validation export. The original training/evaluation scripts, exact split-membership records, source dataset hash, and end-to-end evaluation report are not available in the repository.

Therefore:

- historical metadata values may be described as **package-declared E3/E7 validation results**;
- they must not be described as newly reproduced results from this audit;
- no new precision, recall, F1, ROC-AUC, PR-AUC, Brier, calibration-error, or confusion-matrix claim is made here; and
- the available CSV provides limited consistency evidence, not independent proof of model performance.

The existing provenance analysis in [`docs/e3_e7_evaluation_provenance_audit.md`](./e3_e7_evaluation_provenance_audit.md) provides the detailed uncertainty assessment.

## 5. Decisioning and production limitations

[`threshold_config.json`](../backend/ml/deployment/fraud_model_v1/threshold_config.json) has:

```json
{
  "status": "not_finalized",
  "default_threshold": null
}
```

Consequently, the active API exposes:

- `raw_probability`;
- `calibrated_fraud_probability`;
- `model_version`; and
- `transaction_id`.

It does not expose a verified risk score, fraud/legitimate decision, or operational review band. Any frontend risk-policy labels or decision examples should be labeled as demo presentation data unless a thresholding policy is later defined and wired to the active API.

The feature engineer maintains behavioral history in process memory and requires chronological transaction order. History is lost on restart and is not shared between workers. Durable state, cross-worker ordering, idempotency, and production concurrency coordination are not implemented.

## 6. Faculty presentation guidance

### Claims supported by current evidence

1. The application has a working React frontend and FastAPI backend.
2. The Analyze workflow can call the active prediction API.
3. The API validates inputs and returns finite raw and calibrated probabilities.
4. The frozen deployment is integrity-checked before loading.
5. The backend reliability and failure-handling tests pass.
6. The frontend builds and type-checks successfully.
7. The deployed model package declares a 22-feature LightGBM plus Platt calibration pipeline.

### Claims to avoid or qualify

1. Do not say that all frontend pages are live model analytics; several are demo/mock-data surfaces.
2. Do not say that the protected regression suite passed; it currently has setup errors.
3. Do not claim that the historical validation metrics were independently reproduced in this audit.
4. Do not claim a finalized fraud threshold, risk score, or production decision engine.
5. Do not claim production multi-worker readiness.
6. Do not claim that checksum verification proves model accuracy.

## 7. Recommended next steps

1. Repair the protected regression test's environment/path contract without editing frozen model artifacts.
2. Preserve the original evaluation scripts, dataset version/hash, split IDs, labels, and end-to-end report in a reproducible artifact location.
3. Define and document an operational threshold using a labeled validation protocol, then add threshold tests.
4. Replace or clearly badge mock frontend analytics before presenting them as live system output.
5. Design durable state and ordering controls before any multi-worker or production deployment.
