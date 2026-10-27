# FraudLens — Full Application and Historical Model Evaluation Audit

**Audit date:** 2026-10-25  
**Repository:** `C:\Users\Mukta\Downloads\fraudlens-insights`  
**Scope:** Application behavior, frozen inference mechanics, historical E3/E7 evidence, dataset provenance, and deployment integrity.

## 1. Executive summary

FraudLens is a functioning academic demonstration application with a standalone React/Vite frontend, an active FastAPI backend, and a frozen `fraud_model_v1` LightGBM deployment with 22 engineered features and Platt calibration.

The following are **VERIFIED** in the current checkout:

- active FastAPI API tests: **19 passed**;
- portable frozen-inference mechanics: **3 passed, 2 skipped**;
- frontend TypeScript typecheck, production build, and lint: completed successfully;
- direct navigation of all listed SPA routes: **11 passed**;
- live health, model metadata, CORS preflight, chronological prediction, invalid-input rejection, and transaction-ID response behavior;
- frozen deployment and protected artifact checksums: **100% matched**.

The following are **NOT VERIFIED** or **FAILED**:

- historical E3/E7 performance reproduction;
- the protected legacy regression suite, which has **3 setup errors**;
- recovery of the original row-level E7 validation predictions and `e2e_inference_integration_report.json`;
- a current independently linked dataset/split manifest for the frozen model;
- production readiness for multi-worker deployment;
- live backend integration for non-Analyze frontend pages.

The checked-in historical metrics are **package-declared historical values**, not newly reproduced results. The current API returns raw and calibrated probabilities only. The operational threshold is explicitly unconfigured, so the application correctly does not claim a definitive fraud/legitimate decision.

**Final readiness assessment:** **PARTIALLY VERIFIED — suitable for a faculty software demonstration, not evidence of independently reproduced model performance or production deployment readiness.**

## 2. Initial repository state

The audit began by recording `git status --short`. The worktree already contained extensive user changes, including deleted legacy frontend-root files, modified `README.md` and `AGENTS.md`, and untracked/reorganized `backend/`, `frontend/`, `docs/`, `data/`, and `.github/` content.

Those changes were preserved. No reset, checkout, clean, commit, retraining, recalibration, or destructive Git command was used.

The requested audit file did not exist before this audit. Existing reports were reviewed before authoring this document:

- [`docs/model_evaluation_data_audit.md`](./model_evaluation_data_audit.md)
- [`docs/e3_e7_evaluation_provenance_audit.md`](./e3_e7_evaluation_provenance_audit.md)
- [`docs/model_validation_report.md`](./model_validation_report.md)
- [`docs/faculty_project_report.md`](./faculty_project_report.md)
- [`docs/verification_results.md`](./verification_results.md)

## 3. Complete application feature inventory

### 3.1 Backend surfaces

| Feature | Status | Evidence |
|---|---|---|
| FastAPI application startup and lifespan initialization | **VERIFIED** | [`backend/app/main.py`](../backend/app/main.py) |
| `GET /health` | **VERIFIED** | Readiness and degraded-state tests; live HTTP 200 |
| `GET /api/v1/model` | **VERIFIED** | Metadata contract test; live response reports LightGBM, 22 features, Platt scaling |
| `GET /api/v1/system/status` | **VERIFIED** | Runtime status test and live service probe |
| `POST /api/v1/predict` valid request | **VERIFIED** | 19-test API suite and live chronological requests |
| Required-field and numeric validation | **VERIFIED** | Missing, negative, non-numeric, NaN, infinity, and empty-ID coverage |
| API generic error handling | **VERIFIED** | Runtime-failure test confirms no exception details are exposed |
| Frozen artifact integrity gate | **VERIFIED** | Startup validation and deployment verifier |
| Stateful prior-transaction feature behavior | **VERIFIED IN ISOLATION** | Portable history test and backend concurrency/history test |
| Multi-worker durable state | **NOT IMPLEMENTED** | State is process-local and lost on restart |
| Authentication, persistence, analyst workflow, chat API | **NOT IMPLEMENTED** for active FastAPI scope | Backend documentation |
| Legacy Flask prediction service | **IMPLEMENTED BUT NOT ACTIVE / NOT VERIFIED** | Legacy code references absent older model artifacts |

### 3.2 Frontend routes and data sources

The route tree includes `/`, `/dashboard`, `/analyze`, `/transactions`, `/transactions/:id`, `/alerts`, `/models`, `/explainability`, `/drift`, `/research`, and `/settings`.

| Surface | Status | Evidence and qualification |
|---|---|---|
| Analyze transaction form | **VERIFIED WORKING AGAINST REAL BACKEND** | [`frontend/src/components/pages/analyze-page.tsx`](../frontend/src/components/pages/analyze-page.tsx) calls [`analyzeTransaction`](../frontend/src/services/api.ts); live browser response displayed |
| Analyze response schema and transaction-ID consistency | **VERIFIED WORKING AGAINST REAL BACKEND** | Frontend validates response and compares returned ID to submitted ID |
| Analyze empty/invalid input handling | **VERIFIED WORKING AGAINST REAL BACKEND** | Browser empty amount message and API validation tests |
| Stale-result protection | **IMPLEMENTED BUT NOT FULLY VERIFIED** | Request-generation guard exists; no dedicated browser timing test was run in this audit |
| Dashboard KPIs and activity charts | **MOCK/DEMO DATA** | `getDashboardStats()` returns local values from `mock-data.ts` |
| Transactions list and details | **MOCK/DEMO DATA** | `getTransactions()` and `getTransaction()` read local generated transactions |
| Alerts | **MOCK/DEMO DATA** | `getAlerts()` returns local generated alerts |
| Model comparison and calibration panels | **MOCK/DEMO DATA** | `getModelMetrics()` returns local static metrics |
| Risk policy table | **MOCK/DEMO DATA / NOT THE ACTIVE API POLICY** | `getRiskPolicy()` contains hard-coded threshold bands despite active threshold being unconfigured |
| Explanation/SHAP panels | **MOCK/DEMO DATA** | `getExplanation()` reads generated local SHAP-like contributions; no live SHAP API exists |
| Drift/anomaly panels | **MOCK/DEMO DATA** | `getDriftMetrics()` returns local values |
| Research metrics | **MOCK/DEMO DATA** | `getResearchMetrics()` returns local dataset summaries |
| Assistant/chat | **MOCK/DEMO DATA** | [`frontend/src/services/chat-service.ts`](../frontend/src/services/chat-service.ts) contains local response logic |
| Direct route navigation and SPA fallback | **VERIFIED WORKING IN ISOLATION** | `scripts/test_spa_routes.py`: 11 routes passed against Vite Preview |
| Production multi-page live data integration | **NOT VERIFIED / NOT IMPLEMENTED** | Only Analyze is wired to the active FastAPI prediction endpoint |

The primary faculty path should remain `/analyze`. Other pages should be introduced as UI prototypes/demo data, not as live analytics.

## 4. Exact verification commands and outcomes

### 4.1 Passed checks

| Command | Outcome |
|---|---|
| `.\backend\.venv\Scripts\python.exe -m pytest .\backend\tests\api -v` | **19 passed**, exit code 0, 21.60 seconds |
| From `frontend\`: `npm run typecheck` | **Passed**, exit code 0 |
| From `frontend\`: `npm run build` | **Passed**, exit code 0 |
| From `frontend\`: `npm run lint` | **Passed**, exit code 0; 0 errors and 6 warnings |
| `.\backend\.venv\Scripts\python.exe -m pytest .\backend\ml\deployment\tests\test_inference_regression_portable.py -v` | **3 passed, 2 skipped**, exit code 0, 11.80 seconds |
| `.\backend\.venv\Scripts\python.exe .\scripts\verify_deployment.py` | **Passed**, all listed checks matched |
| `.\backend\.venv\Scripts\python.exe .\scripts\test_spa_routes.py` with Vite Preview on port 4173 | **11 routes passed**, exit code 0 |
| `OPTIONS /api/v1/predict` with origin `http://127.0.0.1:5173` | **HTTP 200**, correct allow-origin and methods |

Frontend lint warnings are existing React Fast Refresh warnings in six UI component files. Vite also emitted a non-failing advisory about native TypeScript path resolution.

### 4.2 Live backend and frontend checks

The backend was started with:

```powershell
Set-Location C:\Users\Mukta\Downloads\fraudlens-insights\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The frontend Preview server was started with:

```powershell
Set-Location C:\Users\Mukta\Downloads\fraudlens-insights\frontend
npm run preview -- --host 127.0.0.1 --port 4173
```

Live results:

- `/health`: HTTP 200, inference service initialized, integrity verified, model/calibrator/feature engineering loaded;
- `/api/v1/model`: HTTP 200, `fraud_model_v1`, LightGBM, 22 features, Platt scaling;
- chronological valid predictions: HTTP 200 with matching `transaction_id`, finite raw probability, and finite calibrated probability;
- negative amount: HTTP 422 validation response;
- CORS preflight from `http://127.0.0.1:5173`: HTTP 200;
- initial out-of-order request: rejected with the documented stream-order error, confirming chronological state enforcement.

Example successful live responses:

```json
{
  "model_version": "fraud_model_v1",
  "transaction_id": "AUDIT-001",
  "raw_probability": 0.4046994658801137,
  "calibrated_fraud_probability": 0.05139487553072046
}
```

```json
{
  "model_version": "fraud_model_v1",
  "transaction_id": "AUDIT-002",
  "raw_probability": 0.5604351205313571,
  "calibrated_fraud_probability": 0.08464787718252671
}
```

The live browser Analyze flow was also exercised earlier in this audit session at `http://127.0.0.1:5173/analyze`. It displayed the actual API result, matching transaction ID, raw and calibrated probabilities, and `Decision: Not configured`. Empty amount submission displayed `Transaction amount is required.`.

These probabilities are integration outputs, not accuracy measurements.

### 4.3 Failed checks

| Command | Outcome | Cause |
|---|---|---|
| `.\backend\.venv\Scripts\python.exe -m pytest .\backend\ml\deployment\tests\test_inference_regression.py -v` | **3 errors**, exit code 1 | Protected test uses an external Colab-derived path and cannot import `integrated_inference` from this checkout |

The failure occurs during `setUpClass`, before assertions run. The protected test was not changed.

### 4.4 Skipped checks

The portable suite skipped two checks:

1. row-level E7 calibration regression because `artifacts\models\E7_calibration\e7_validation_predictions.csv` is absent;
2. E2E reproducibility because `artifacts\evaluation\end_to_end_inference\e2e_inference_integration_report.json` is absent.

These skips are honest guards in the portable test; no substitute fixture was generated.

## 5. Frozen inference verification

### 5.1 Contract and loading

The package declares:

- model version: `fraud_model_v1`;
- model type: LightGBM;
- feature count: 22;
- target: `isFraud`;
- calibration: Platt scaling;
- calibration input: logit of raw probability.

`model_config.json` and `feature_schema.json` contain the same ordered 22 feature names. A direct audit confirmed:

- config count = 22;
- schema count = 22;
- feature order matches;
- feature names are unique; and
- all declared feature names are present in the frozen feature-engineering source.

The active service loads the frozen LightGBM model, production feature module, calibrator, metadata, manifest, and checksum index before reporting ready.

### 5.2 Prediction and state behavior

The portable suite verified finite `[0, 1]` raw and calibrated probabilities, use of the frozen model/calibrator, and prior-only behavioral history. The active API suite verified matching transaction IDs and response schema.

Repeated chronological predictions for the same entity are stateful by design. Calls are serialized inside one process. Out-of-order `TransactionDT` values are rejected. History is not shared across processes and is lost at restart.

### 5.3 Calibration verification

The calibration artifact's coefficient and intercept match `calibration_config.json` to the configured precision. The implementation retains the expected clipped-probability, logit, and logarithm markers.

The checked-in `E7_raw_vs_calibrated_comparison.csv` has exactly two data rows, but those rows are aggregate metric rows with columns:

```text
experiment,model_variant,pr_auc,roc_auc,brier_score,log_loss,ece_10_bins
```

It does not contain `raw_e3_probability`, `calibrated_e3_probability`, transaction identifiers, or labels. Therefore the row-level E7 calibration assertion cannot run from this file.

### 5.4 Decision honesty

[`threshold_config.json`](../backend/ml/deployment/fraud_model_v1/threshold_config.json) declares:

```json
{
  "status": "not_finalized",
  "default_threshold": null
}
```

The active API exposes raw and calibrated probabilities only. It does not produce a verified risk score or definitive fraud/legitimate decision. The Analyze page correctly displays `Decision: Not configured`.

## 6. Historical E3/E7 evidence inventory

### 6.1 Frozen package artifacts

| Artifact | Path | Size | SHA-256 | What it proves |
|---|---|---:|---|---|
| E7 aggregate comparison | `backend/ml/deployment/fraud_model_v1/E7_raw_vs_calibrated_comparison.csv` | 303 bytes | `8f6e8239e079f6e29ff26596a57b3a9fb693138d865b0c1292c273c02adb1a0c` | Stores two aggregate E7 metric rows; no row-level provenance |
| Model metadata | `backend/ml/deployment/fraud_model_v1/model_metadata.json` | 1,933 bytes | `da964424f1120f2e02d640b73957598bddf44291495bdd2302668bc3a4670185` | Declares model identity, counts, and historical metrics |
| Model config | `backend/ml/deployment/fraud_model_v1/model_config.json` | 1,807 bytes | `a61383c9de5f6c3da40a1b14f8bc7f1d07f79232cefc210c857853c4325350b6` | Declares E3/E7 identity and 22-feature contract |
| Calibration config | `backend/ml/deployment/fraud_model_v1/calibration_config.json` | 682 bytes | `9d5e5be24124958eee443b7a5dfa5d7b093ad24d3a9fd4e162de39f4d993d252` | Declares Platt coefficients and historical calibration metrics |
| Freeze manifest | `backend/ml/deployment/fraud_model_v1/deployment_freeze_manifest.json` | 1,724 bytes | `4bba49ae9e38787018ee02bf46d11867ce72783c8ea763a7c5f88062f611cc53` | Declares freeze status, source Colab paths, and historical reproducibility assertions |
| Protected legacy test | `backend/ml/deployment/tests/test_inference_regression.py` | 4,213 bytes | `3be8fe40b0923f0029a589ac48bd0d82bb77bcd8ae02e3543c9327c54590a51b` | Shows the original external fixture/report dependencies |
| Portable regression test | `backend/ml/deployment/tests/test_inference_regression_portable.py` | 5,749 bytes | `bae2c27669d466ff5a0d5e795d6874fe0f73cb6cffd6c3e1ab79135edd31209f` | Safe local mechanics checks and explicit missing-fixture skips |

The hash for `calibration_config.json` was recorded from the current file as `9d5e5be24124958eee443b7a5dfa5d7b093ad24d3a9fd4e162de39f4d993d252`.

### 6.2 Missing original artifacts

Searches of the repository, `data/`, `backend/`, `scripts/`, `docs/`, accessible Downloads folders, and reachable Git history found no genuine local copy of:

- E3 training/feature-engineering source tied to this frozen model;
- E3 training logs or run provenance;
- E7 calibration/evaluation source;
- calibration-fit transaction IDs;
- exact train/calibration/validation/test split manifests;
- source dataset hash manifest for the frozen model;
- row-level `e7_validation_predictions.csv`;
- `e2e_inference_integration_report.json`; or
- the original end-to-end evaluation fixtures.

The freeze manifest records the original paths under `/content/drive/MyDrive/fraud-detection-platform`, but a path string is not proof that the referenced files are available or reproducible here.

## 7. Dataset and split provenance

The repository contains multiple datasets and historical experiment outputs. They are not interchangeable evaluation evidence for the deployed 22-feature model.

| Dataset/artifact | Path and observed SHA-256 | Observed schema/provenance | Disposition |
|---|---|---|---|
| IEEE-CIS train transactions | `data/raw/ieee_cis/train_transaction.csv`, 226,492,416 bytes, `c34f2c8967f919ad3b244d8d87232c67e76427603f8cc2afea1c86b31f8206b6` | Labeled `isFraud`; local audit records 193,540 rows and 5,689 frauds | Population does not reconcile with frozen metadata's 590,540 rows; no frozen split IDs/hash |
| IEEE-CIS train identity | `data/raw/ieee_cis/train_identity.csv`, 26,529,680 bytes, `b63c725d8377be90a995268d97f347c17d456b95db45807adcf9f59cd603c37c` | Identity merge input | No proof it is the exact frozen training source |
| IEEE-CIS competition test | `data/raw/ieee_cis/test_transaction.csv`, 230,686,720 bytes, `13e2c6318329f27930da63cfaae8f108162349cfcc7b432d6de519d10b009b06` | No genuine fraud labels; sample submission uses placeholders | Not evaluable for accuracy |
| IEEE feature metadata | `data/processed/ieee_cis/ieee_cis_feature_engineering_metadata.json`, 1,479 bytes, `e90b6161dcd8c8a92046f0e261ed3637a7b27894767bea6992a2a1ac53c72ec7` | Chronological 70/15/15, 135,478/29,031/29,031 rows, 399-feature historical E1 lineage | Incompatible/unreconciled with deployed 22-feature package |
| PaySim | `data/raw/paysim/PS_20174392719_1491204439457_log.csv`, 493,534,783 bytes, `16910f90577b0d981bf8ff289714510bb89bc71bff7d3f220f024e287e4eea6b` | Separate synthetic mobile-money schema and E2 experiments | Not an evaluation cohort for `fraud_model_v1` |
| Credit Card Fraud | `data/raw/credit_card_fraud/creditcard.csv`, 150,828,752 bytes, `76274b691b16a6c49d3f159c883398e03ccd6d1ee12d9d8ee38f4b4b98551a89` | `Class` target, V1–V28/Amount/Time lineage; download metadata cites Zenodo 7395559 | Separate 37-feature model lineage, not deployed model |
| PaySim split audit | `data/processed/paysim/audit/temporal_split_audit.csv`, 193 bytes, `9c768f8a06f5876ba7492c6017439ebe5e243962771e76ba3a7500741c68cf2a` | PaySim temporal split | Not applicable to deployed model |
| Credit Card split metadata | `data/processed/credit_card_fraud/credit_card_temporal_split_metadata.json`, 464 bytes, `f5873ac0128c75f9d221fcd8b35e4ca45ceb409ac4a35779aca6973095d3d685` | Credit Card positional temporal split | Not applicable to deployed model |

The local datasets can document related research history, but they do not establish the frozen model's exact source snapshot, split membership, calibration cohort, or held-out evaluation labels.

## 8. Historical versus reproduced metrics

No metric reproduction is justified by the available evidence.

The package declares historical values, including:

- raw E3 PR-AUC: `0.164383`;
- calibrated E7 PR-AUC: `0.164383`;
- raw E3 ROC-AUC: `0.762803`;
- calibrated E7 ROC-AUC: `0.762803`;
- calibrated Brier score: `0.030997`;
- calibrated log loss: `0.131387`; and
- calibrated 10-bin ECE: `0.006222`.

These values are **NOT VERIFIED as independently reproduced metrics**. The two-row CSV stores aggregate values only. The row-level predictions, labels, split records, original runner, and E2E report required to recompute them are missing or external.

No new accuracy, precision, recall, F1, PR-AUC, ROC-AUC, Brier, calibration error, confusion matrix, or threshold metric was calculated from an unverified cohort.

## 9. Legacy regression-test failure analysis

The protected test defaults to:

```text
/content/drive/MyDrive/fraud-detection-platform
```

It then expects:

```text
artifacts/deployment/inference/integrated_inference.py
artifacts/models/E7_calibration/e7_validation_predictions.csv
artifacts/evaluation/end_to_end_inference/e2e_inference_integration_report.json
```

In the current Windows checkout, setup fails before assertions with:

```text
ModuleNotFoundError: No module named 'integrated_inference'
```

The original report cannot be recovered from the searched repository, accessible project folders, or reachable Git history. It was not recreated, faked, skipped, or replaced. The portable test is the appropriate separate local mechanics test and explicitly skips the unavailable historical fixtures.

## 10. Protected-file integrity

The following protected paths were not edited:

- `backend/ml/deployment/inference/integrated_inference.py`
- `backend/ml/deployment/inference/production_feature_engineering.py`
- `backend/ml/deployment/fraud_model_v1/`
- `backend/ml/deployment/tests/test_inference_regression.py`
- `checksums_sha256.json`
- `deployment_freeze_manifest.json`

The final deployment verifier reported:

```text
RESULT: ALL FROZEN DEPLOYMENT CHECKSUMS VERIFIED SUCCESSFULLY (100% Match)
```

The verifier matched 11 deployment artifact entries, 2 inference-module entries, and the manifest-protected regression-test hash.

## 11. Remaining blockers and concrete next actions

### Blockers

1. **Historical reproducibility:** obtain the original row-level E7 predictions, labels, split IDs, training/calibration source snapshot, scripts, and E2E report from the original artifact owner or storage.
2. **Dataset linkage:** record a source dataset version and SHA-256 manifest tied to the frozen model's 590,540-row population.
3. **Operational decisioning:** define and validate a threshold policy before presenting risk bands or fraud/legitimate decisions as live behavior.
4. **Frontend data honesty:** keep demo labels visible on dashboard/research/alerts/explanation surfaces or wire them to real APIs.
5. **Production state:** add durable shared history, ordering, idempotency, and multi-worker coordination before production deployment.
6. **Regression portability:** preserve a supported local fixture or environment mapping without modifying the protected historical test.

### Recommended next actions

1. Archive the original E3/E7 run bundle with immutable hashes.
2. Add a separate traceable integration fixture for the frozen API using authorized labeled inputs only after provenance is established.
3. Add a browser timing test for stale-response suppression.
4. Add visible “Demo data” badges to non-live analytics pages.
5. Keep the active API probability-only until threshold governance is complete.

## 12. Final faculty demonstration readiness

**Status: PARTIALLY VERIFIED.**

FraudLens is ready to demonstrate:

1. React/Vite frontend startup;
2. FastAPI startup and frozen model readiness;
3. raw transaction submission;
4. stateful feature-engineering delegation;
5. LightGBM raw probability;
6. Platt-calibrated probability;
7. input validation and error handling;
8. matching transaction identifiers; and
9. integrity verification.

For the faculty demonstration, use the Analyze page as the primary live path. Present dashboard, alerts, transactions, research, drift, risk-policy, assistant, and explanation pages as interface prototypes backed by demo data. State clearly that historical metrics are stored package metadata and that independent E3/E7 reproduction is unavailable.
