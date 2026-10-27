# FraudLens — Comprehensive Prediction Correctness Audit

**Audit date:** 2026-10-25  
**Repository:** `C:\Users\Mukta\Downloads\fraudlens-insights`  
**Audit scope:** Prediction integration correctness, frozen inference mechanics, calibration reproducibility, dataset provenance, historical performance evidence, and frontend live/mock boundaries.

## 1. Executive summary

FraudLens has a working academic prediction-serving path:

```text
React/Vite Analyze page
    -> FastAPI POST /api/v1/predict
    -> InferenceService
    -> frozen IntegratedFraudInference
    -> frozen 22-feature behavioral feature engineering
    -> frozen LightGBM fraud_model_v1
    -> frozen Platt calibration
    -> raw and calibrated probabilities
```

The following are supported by executable evidence in the current checkout:

- API and inference integration: **PASS**
- active FastAPI tests: **19 passed**
- portable frozen-inference mechanics: **3 passed, 2 skipped**
- frontend typecheck, production build, and lint: passed; lint has six warnings
- frozen deployment integrity: passed with all checked hashes matching
- live health, model metadata, CORS, valid chronological predictions, input rejection, and transaction-ID consistency
- frontend Analyze flow displaying the actual backend response

The following are not established:

- predictive performance on an independently verified held-out labeled test set;
- reproduction of the historical E3/E7 metrics;
- recovery of the original E7 row-level predictions, split manifests, calibration cohort, or E2E report;
- production readiness for multiple workers or durable state;
- live backend integration for most non-Analyze frontend screens.

Final verdict:

| Category | Verdict |
|---|---|
| API/inference integration | **PASS** |
| Predictive performance | **NOT VERIFIED** |
| Calibration quality | **NOT VERIFIED** as a quality claim; calibration mechanics are **PARTIALLY VERIFIED** |
| Production readiness | **NOT VERIFIED** |

HTTP 200 responses and plausible probabilities demonstrate software execution, not prediction correctness or fraud-detection accuracy.

## 2. Environment and model details

### Environment

- Operating system: Windows
- Python used for backend checks: `backend\.venv\Scripts\python.exe`
- Python version reported by pytest: 3.10.11
- Pytest: 8.4.2
- Frontend package manager: npm
- Frontend stack: React, TypeScript, Vite, TanStack Router, Tailwind CSS

### Deployed model

The frozen package under [`backend/ml/deployment/fraud_model_v1/`](../backend/ml/deployment/fraud_model_v1/) declares:

- version: `fraud_model_v1`;
- model: LightGBM;
- target: `isFraud`;
- feature count: 22;
- base experiment: E3;
- calibration experiment: E7;
- calibration: Platt scaling;
- training rows: 472,432;
- recorded validation rows: 118,108;
- calibrated output: `calibrated_fraud_probability`.

The API schema accepts raw `TransactionID`, `TransactionDT`, and `TransactionAmt`, plus optional raw behavioral identifiers. Feature engineering remains in the frozen package and is not recreated in the frontend or FastAPI adapter.

The active response schema is:

```json
{
  "model_version": "string",
  "transaction_id": "string or integer",
  "raw_probability": "number in [0, 1]",
  "calibrated_fraud_probability": "number in [0, 1]"
}
```

The active threshold configuration has `status: not_finalized` and `default_threshold: null`. The system therefore does not have an approved fraud/legitimate decision policy.

## 3. Tests executed and exact outcomes

### Passed checks

| Command | Exit/result |
|---|---|
| `.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests\api -q` | Exit 0; **19 passed** in 22.90 seconds |
| `.\backend\.venv\Scripts\python.exe -m pytest .\backend\ml\deployment\tests\test_inference_regression_portable.py -q` | Exit 0; **3 passed, 2 skipped** in 14.94 seconds |
| From `frontend\`: `npm run typecheck` | Exit 0; passed |
| From `frontend\`: `npm run build` | Exit 0; passed |
| From `frontend\`: `npm run lint` | Exit 0; passed with **0 errors and 6 warnings** |
| `.\backend\.venv\Scripts\python.exe .\scripts\verify_deployment.py` | Exit 0; all frozen checksums matched |

The portable suite's passed tests cover frozen prediction mechanics, prior-only feature history, and the calibration source contract. Its two skipped tests require unavailable historical fixtures.

### Failed checks

| Command | Exit/result | Reason |
|---|---|---|
| `.\backend\.venv\Scripts\python.exe -m pytest .\backend\ml\deployment\tests\test_inference_regression.py -q` | Exit 1; **3 errors** | Protected test imports `integrated_inference` from an external Colab-derived artifact path that is unavailable in this checkout |

The failure occurs during `setUpClass` with `ModuleNotFoundError: No module named 'integrated_inference'`, before the test assertions execute.

### Warnings

- ESLint: six existing `react-refresh/only-export-components` warnings in UI component files.
- Vite: advisory that native TypeScript path resolution could replace `vite-tsconfig-paths`.
- npm: upgrade notice; no dependency changes were made.

## 4. API and frontend prediction correctness

### API checks

The active API tests and live probes verified:

| Check | Expected behavior | Result |
|---|---|---|
| Health | Ready only when frozen artifacts, model, calibrator, and feature engineer load | **PASS** |
| Model metadata | Reports `fraud_model_v1`, LightGBM, 22 features, Platt scaling | **PASS** |
| Valid request | HTTP 200 with required response fields | **PASS** |
| Probability bounds | Raw and calibrated values finite and in `[0, 1]` | **PASS** |
| Returned ID | Matches submitted `TransactionID` | **PASS** |
| Missing required fields | HTTP 422 validation response | **PASS** |
| Negative amount | HTTP 422 validation response | **PASS** |
| Non-numeric/NaN/infinite values | HTTP 422 validation response | **PASS** |
| Empty transaction ID | Rejected by schema validation | **PASS** |
| Malformed request shape | Rejected by request validation | **PASS** |
| Runtime failure | Generic HTTP 500 without exception details | **PASS** |
| Missing/tampered deployment | Degraded readiness and HTTP 503 behavior | **PASS** |
| CORS preflight | HTTP 200 for `http://127.0.0.1:5173` | **PASS** |
| Chronological repeated inference | Valid increasing timestamps accepted; prior history affects later features | **PASS** |
| Out-of-order timestamp | Rejected according to stream-order contract | **PASS** |

The backend maintains one process-local stateful inference engine and serializes calls. State is lost on restart and is not shared across workers. This behavior is documented and is suitable for an academic sequential stream, not a production multi-worker deployment.

### Frontend checks

The Analyze page:

- sends the actual API request through [`frontend/src/services/api.ts`](../frontend/src/services/api.ts);
- validates the response shape and probability bounds;
- compares the response transaction ID with the submitted ID;
- clears stale results when inputs change;
- uses a request-generation guard to avoid stale responses overwriting newer results;
- displays an honest `Decision: Not configured` state while threshold configuration is absent.

The live browser flow was previously exercised against the real backend and displayed the actual frozen-model response. Empty amount submission displayed a validation error. A dedicated automated browser timing test for stale-response ordering was not run; that feature is therefore **IMPLEMENTED BUT NOT FULLY VERIFIED**.

Raw and calibrated probabilities are represented as separate fields throughout the API and frontend. The frontend does not convert the calibrated probability into an invented risk score or decision.

## 5. Predictive-performance assessment

### Performance verdict: NOT VERIFIED

No independent performance metric was calculated during this audit.

The frozen package stores historical aggregate values, including:

- raw E3 PR-AUC: `0.164383`;
- calibrated E7 PR-AUC: `0.164383`;
- raw/calibrated ROC-AUC: `0.762803`;
- calibrated Brier score: `0.030997`;
- calibrated log loss: `0.131387`;
- calibrated 10-bin ECE: `0.006222`.

These values are package metadata and aggregate CSV contents. They are not newly reproduced measurements.

The checked-in [`E7_raw_vs_calibrated_comparison.csv`](../backend/ml/deployment/fraud_model_v1/E7_raw_vs_calibrated_comparison.csv) contains a header and two aggregate metric rows:

```text
experiment,model_variant,pr_auc,roc_auc,brier_score,log_loss,ece_10_bins
```

It contains no transaction IDs, labels, row-level raw probabilities, row-level calibrated probabilities, or split identifiers. It cannot support independent metric recomputation.

The unavailable evidence includes:

- original E3 training and feature-engineering source;
- E3 training logs and model-run provenance;
- E7 calibration/evaluation source;
- calibration-fit transaction identifiers;
- exact train/calibration/validation/test split manifests;
- source dataset version/hash tied to the frozen model;
- row-level `e7_validation_predictions.csv`;
- `e2e_inference_integration_report.json`; and
- original end-to-end evaluation fixtures.

No unrelated dataset was substituted. The local IEEE-CIS, PaySim, and Credit Card Fraud datasets belong to different or unreconciled experiment lineages and were not used to claim performance for `fraud_model_v1`.

## 6. Dataset provenance and leakage assessment

### Deployed model provenance

The model metadata records a total of 590,540 training-plus-validation rows. The local IEEE-CIS labeled transaction file contains 193,540 rows according to the existing data audit. The counts do not reconcile, and no checked-in row-ID manifest or source hash links the local file to the frozen model's training population.

The freeze manifest contains original paths under:

```text
/content/drive/MyDrive/fraud-detection-platform
```

Those path strings document claimed origins but do not make the external files available or independently verifiable.

### Other local datasets

| Dataset | Relevant evidence | Compatibility conclusion |
|---|---|---|
| IEEE-CIS | Labeled `isFraud`, but local row count/split metadata do not reconcile with 590,540 frozen rows; available feature metadata describes a separate 399-feature E1 lineage | **NOT VERIFIED** for frozen-model evaluation |
| IEEE-CIS competition test | No genuine fraud labels; sample submission values are placeholders | Cannot evaluate accuracy |
| PaySim | Separate mobile-money schema and E2 experiment lineage | Not compatible with frozen model |
| Credit Card Fraud | V1–V28/Amount/Time and 37-feature historical model lineage | Not compatible with 22-feature frozen model |

The frozen feature engineer is chronological and uses prior transaction history. A valid replay would require the exact source population, ordering, split membership, and permitted pre-evaluation history. Those artifacts are unavailable. No leakage claim beyond the package's declared metadata was independently established.

## 7. Calibration and threshold limitations

### Calibration mechanics

Calibration mechanics are **PARTIALLY VERIFIED**:

- the frozen calibration artifact loads;
- the configured coefficient and intercept match the calibration configuration;
- the frozen source contains the expected clipping, logit, and logarithm operations;
- raw and calibrated API fields are distinct and bounded;
- the portable suite confirms the calibration contract markers.

Calibration quality is **NOT VERIFIED** because the original row-level raw predictions, calibrated predictions, labels, and calibration-fit cohort are missing. Two aggregate rows and integration examples cannot establish calibration quality.

### Decision threshold

The package's `threshold_config.json` states that no operational threshold has been finalized. The application correctly exposes calibrated probability and does not claim a definitive fraud/legitimate decision, approved risk score, or policy band.

Any static risk-policy bands or explanations on other frontend pages are demo data and must not be presented as the active model's decision policy.

## 8. Mock versus live frontend feature inventory

| Feature | Status | Evidence |
|---|---|---|
| Analyze transaction | **Verified working against real backend** | Real `POST /api/v1/predict` integration |
| Dashboard KPIs/charts | **Mock/demo data** | Local `mock-data.ts` values |
| Transaction history/details | **Mock/demo data** | Local generated transactions |
| Alerts | **Mock/demo data** | Local generated alerts |
| Model comparison metrics | **Mock/demo data** | Local static metrics |
| Risk policy | **Mock/demo data** | Hard-coded bands; not active threshold configuration |
| SHAP/explanations | **Mock/demo data** | Generated local contribution objects; no live SHAP API |
| Drift/anomaly monitoring | **Mock/demo data** | Local static results |
| Research metrics | **Mock/demo data** | Local static dataset summaries |
| Assistant/chat | **Mock/demo data** | Local response service |
| SPA routing/direct navigation | **Verified in isolation** | Route audit passed all 11 routes |

Before presenting the project as a fully live platform, add visible demo labels to these non-Analyze surfaces or connect them to traceable backend services.

## 9. Prioritized improvement plan

1. **Restore historical provenance:** obtain the original E3/E7 run bundle, exact source dataset hash, split IDs, calibration cohort, row-level predictions, labels, scripts, and E2E report.
2. **Create a reproducible evaluation runner:** use only the authorized, exact frozen-model cohort and document temporal state replay before calculating metrics.
3. **Add a verified evaluation dashboard:** show dataset identity, model version, calibration version, split lineage, labels, and metric provenance together.
4. **Implement real explanations:** expose feature contributions generated by a supported, traceable explanation method for the exact deployed model; do not reuse synthetic SHAP-like values.
5. **Add persistent transaction history:** use durable storage with ordering, idempotency, and audit records before scaling beyond one process.
6. **Implement drift monitoring:** connect drift statistics to versioned incoming data and declared reference windows.
7. **Define a validated risk policy:** select an operating threshold only from a documented validation protocol, then expose the policy version in the API and UI.
8. **Add browser regression coverage:** automate stale-request suppression, response-ID mismatch, API outage, recovery, and repeated-submit behavior.

## 10. Protected-file hash comparison

Hashes were captured before and after the audit. The protected individual-file hashes remained unchanged:

| Protected file | Before SHA-256 | After SHA-256 | Result |
|---|---|---|---|
| `backend/ml/deployment/inference/integrated_inference.py` | `03e9d40007b0ca72f49520567c76fa13f8104008a509ce54e738b7807a3f26c0` | Same | **UNCHANGED** |
| `backend/ml/deployment/inference/production_feature_engineering.py` | `afafa91b4333a9060be04d7ffe7c59459cfeb8cca3ea2e90462195eefe5ae5d9` | Same | **UNCHANGED** |
| `backend/ml/deployment/tests/test_inference_regression.py` | `3be8fe40b0923f0029a589ac48bd0d82bb77bcd8ae02e3543c9327c54590a51b` | Same | **UNCHANGED** |

The frozen deployment directory was also verified using the repository's checksum validator after testing:

```text
RESULT: ALL FROZEN DEPLOYMENT CHECKSUMS VERIFIED SUCCESSFULLY (100% Match)
```

That validator matched the deployment artifact entries, inference-module entries, and protected regression-test hash recorded by the deployment manifest.

The checksums and freeze manifest are inside the frozen deployment package and were not edited. No protected path was modified.

## 11. Final verdict

### API/inference integration: PASS

The real service starts, loads the frozen artifacts, validates inputs, produces bounded raw and calibrated probabilities, preserves transaction identity, handles errors, enforces chronological state behavior, and passes the active API suite.

### Predictive performance: NOT VERIFIED

No independent labeled, compatible, traceable held-out evaluation cohort and complete original evaluation protocol are available. Historical aggregate metrics remain unreproduced.

### Calibration quality: NOT VERIFIED

The calibration implementation and artifact contract are partially verified. Calibration quality cannot be established without the original evaluation rows, labels, and cohort provenance.

### Production readiness: NOT VERIFIED

The service uses process-local in-memory behavioral state, has no multi-worker coordination, no durable transaction history, no finalized threshold policy, and several mock frontend surfaces.

## 12. Audit completion summary

### Actually tested

- active backend API behavior;
- portable frozen inference mechanics;
- frontend typecheck, build, and lint;
- deployment integrity;
- live model health and metadata;
- valid and invalid prediction requests;
- chronological state behavior;
- CORS behavior;
- frontend live Analyze integration;
- direct SPA route fallback.

### Could not be verified

- original E3/E7 metric reproduction;
- historical row-level calibration reproduction;
- original E2E report;
- exact frozen-model dataset and split lineage;
- production deployment readiness;
- dedicated automated browser stale-request timing.

### Files changed by this audit

- Added only [`docs/prediction_correctness_audit.md`](./prediction_correctness_audit.md).
- No application code, model artifact, calibrator, feature-engineering source, protected test, checksum, or freeze-manifest file was changed.

### Exact next action required

Obtain the original E3/E7 evaluation bundle from its authoritative storage, including the labeled row-level validation predictions, split manifests, calibration cohort, source dataset hash, evaluation scripts, and `e2e_inference_integration_report.json`. Until that bundle is available and independently linked to `fraud_model_v1`, predictive performance and calibration quality must remain **NOT VERIFIED**.
