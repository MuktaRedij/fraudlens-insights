# FraudLens — Frozen Model Dataset Readiness Audit

**Audit date:** 2026-10-25  
**Repository:** `C:\Users\Mukta\Downloads\fraudlens-insights`  
**Scope:** Determine whether the current checkout contains a compatible, independent, labeled test dataset for frozen `fraud_model_v1`.

## 1. Executive summary

**Verdict: NO SUITABLE LABELED DATASET FOUND.**

The repository contains labeled datasets, but none can be used to make a defensible new performance claim for the deployed `fraud_model_v1`:

- The local IEEE-CIS training file has `193,540` labeled rows and `394` columns, while the frozen package records `472,432` training rows plus `118,108` validation rows. No dataset hash, row-ID manifest, or source snapshot reconciles those populations.
- The checked-in IEEE-CIS split metadata describes a separate `399`-feature E1 lineage with a `135,478 / 29,031 / 29,031` chronological split. It does not establish the split membership for the frozen 22-feature E3 model.
- The IEEE-CIS competition test file has no `isFraud` labels. Its sample submission values are placeholders, not ground truth.
- PaySim and Credit Card Fraud contain labels, but their feature contracts, identifiers, and model experiments are unrelated to the deployed IEEE-CIS-derived 22-feature pipeline.
- The frozen E7 CSV contains two aggregate metric rows, not row-level labels and predictions. It cannot support a new metric calculation.

No performance metrics were calculated in this audit. The historical E3/E7 values stored in model metadata remain historical package declarations, not independently reproduced results.

## 2. Frozen deployment contract

The frozen package is identified as:

- Model version: `fraud_model_v1`
- Base experiment: E3
- Calibration experiment: E7
- Model: LightGBM
- Target: `isFraud`
- Feature count: 22
- Feature order: defined by `feature_schema.json`
- Behavioral requirement: features must use only transactions observed before the scored transaction
- Calibration: Platt scaling applied to the raw probability
- Operational threshold: not finalized; `default_threshold` is `null`

The 22 model features are engineered features, not simply 22 columns that can be selected from an arbitrary CSV. Replaying a valid evaluation requires the exact raw source population, chronological ordering, prior-history context, feature-engineering behavior, model version, and labels.

## 3. Candidate dataset inventory

Hashes below were calculated from the files in the current checkout. They identify the local files only; they do not prove download provenance or relationship to the frozen model.

| Candidate | Path | Shape and labels | SHA-256 | Assessment |
|---|---|---:|---|---|
| IEEE-CIS labeled transactions | [`data/raw/ieee_cis/train_transaction.csv`](../data/raw/ieee_cis/train_transaction.csv) | 193,540 rows × 394 columns; `isFraud`: 187,851 zeros, 5,689 ones | `c34f2c8967f919ad3b244d8d87232c67e76427603f8cc2afea1c86b31f8206b6` | **NOT SUITABLE for a definitive claim**: labeled and structurally related, but population identity, split membership, and independence from frozen training/calibration are not established. |
| IEEE-CIS competition test | [`data/raw/ieee_cis/test_transaction.csv`](../data/raw/ieee_cis/test_transaction.csv) | 198,908 rows × 393 columns; no target column | `13e2c6318329f27930da63cfaae8f108162349cfcc7b432d6de519d10b009b06` | **NOT EVALUABLE**: no genuine labels. |
| PaySim | [`data/raw/paysim/PS_20174392719_1491204439457_log.csv`](../data/raw/paysim/PS_20174392719_1491204439457_log.csv) | 6,362,620 rows × 11 columns; `isFraud`: 6,354,407 zeros, 8,213 ones | `16910f90577b0d981bf8ff289714510bb89bc71bff7d3f220f024e287e4eea6b` | **INCOMPATIBLE**: synthetic mobile-money schema and separate PaySim E2/E3 experiments; no IEEE-CIS behavioral feature contract. |
| Credit Card Fraud | [`data/raw/credit_card_fraud/creditcard.csv`](../data/raw/credit_card_fraud/creditcard.csv) | 284,807 rows × 31 columns; `Class`: 284,315 zeros, 492 ones | `76274b691b16a6c49d3f159c883398e03ccd6d1ee12d9d8ee38f4b4b98551a89` | **INCOMPATIBLE**: anonymized V1–V28/Amount/Time schema and separate 20J model lineage. |
| Frozen E7 comparison | [`backend/ml/deployment/fraud_model_v1/E7_raw_vs_calibrated_comparison.csv`](../backend/ml/deployment/fraud_model_v1/E7_raw_vs_calibrated_comparison.csv) | 2 aggregate rows × 7 metric columns; no transaction IDs or labels | `8f6e8239e079f6e29ff26596a57b3a9fb693138d865b0c1292c273c02adb1a0c` | **NOT A TEST DATASET**: records historical aggregate values only. |

The repository contains processed outputs for multiple experiment families. Their presence does not establish compatibility with the frozen model and they were not substituted as evaluation data.

## 4. Compatibility and leakage assessment

### 4.1 IEEE-CIS labeled file

The IEEE-CIS file has raw fields that resemble the deployed pipeline, including `TransactionID`, `TransactionDT`, `TransactionAmt`, `card1`, `addr1`, and `P_emaildomain`. That similarity is insufficient by itself.

The checked-in metadata [`data/processed/ieee_cis/ieee_cis_feature_engineering_metadata.json`](../data/processed/ieee_cis/ieee_cis_feature_engineering_metadata.json) describes:

- chronological 70/15/15 splitting;
- train: 135,478 rows, 3,490 frauds;
- validation: 29,031 rows, 1,046 frauds;
- internal test: 29,031 rows, 1,153 frauds;
- a 399-feature E1 feature-engineering lineage.

The frozen model metadata instead records:

- training: 472,432 rows, 16,599 frauds;
- validation: 118,108 rows, 4,064 frauds;
- exactly 22 engineered features;
- E3 base model and E7 calibration.

There is no checked-in row-ID manifest, source snapshot identifier, dataset hash referenced by the model package, or calibration-cohort identifier that proves the local IEEE-CIS rows are independent of frozen training and calibration. Reusing this file would therefore risk evaluating the wrong population or contaminated data.

### 4.2 Competition test file

The competition test file has no `isFraud` column. Placeholder values in `sample_submission.csv` are not labels. No metric can be calculated from this data without obtaining the authoritative labels, and those labels must also be linked to the exact frozen-model evaluation protocol.

### 4.3 PaySim and Credit Card Fraud

The local processed metadata documents separate model families:

- PaySim uses account identifiers such as `nameOrig` and `nameDest`, a transaction simulation schema, and PaySim-specific models.
- Credit Card Fraud uses `Time`, `V1`–`V28`, `Amount`, and `Class`, with a separate temporal split and model.

Neither dataset can be made compatible by selecting or renaming 22 columns. Their raw fields, history semantics, target populations, preprocessing, and trained models differ from `fraud_model_v1`.

### 4.4 Stateful temporal inference

The frozen feature engineer calculates behavioral features from prior transactions and rejects out-of-order timestamps. A valid evaluation must specify the initial state, chronological replay order, treatment of pre-test history, and whether any rows used to build state belong to training, calibration, or evaluation. No authorized frozen state snapshot or replay manifest is available.

## 5. Historical metrics and what they do not prove

The package declares historical E3/E7 validation values, including calibrated PR-AUC `0.1643833631305546`, ROC-AUC `0.7628028272414267`, Brier score `0.030996558543551225`, log loss `0.1313866173057246`, and ECE `0.006222077919956914`.

These values were not recalculated here because the row-level predictions, labels, split identifiers, original evaluation source, and complete run provenance are unavailable. They remain **historical metadata**, not an independently reproduced performance result.

The calibration mechanics and deployment integrity can be checked separately, but successful frozen inference or calibration arithmetic does not establish fraud-detection accuracy.

## 6. Evidence-gap and recovery checklist

| Missing artifact | Why it is required | Recovery source | Current status |
|---|---|---|---|
| Exact dataset snapshot and SHA-256 manifest used for E3 | Establishes the population and input bytes used to fit the frozen model | Original training workspace, archive, or experiment run storage | Not found in repository or documented sibling artifact directory |
| Exact train/calibration/validation row-ID manifests | Proves independence and prevents train/calibration/test contamination | Original E3/E7 run artifacts | Not found |
| E3 training and feature-engineering source | Defines preprocessing and split implementation | Original experiment repository or notebook archive | Not found |
| E7 calibration source and calibration-cohort IDs | Proves how Platt scaling was fitted and which labels were used | Original calibration run artifacts | Not found |
| Row-level E7 predictions with labels | Required to recompute PR-AUC, ROC-AUC, Brier, log loss, and calibration metrics | Original E7 export or evaluation store | Not found; only two aggregate rows are present |
| Original end-to-end evaluation report | Links model bytes, data, predictions, environment, and reported results | Referenced external/Colab artifact location | Not found |
| Authorized temporal replay protocol/state snapshot | Required for stateful behavioral features | Original deployment/evaluation run documentation | Not found |

The most concrete next action is to obtain an immutable archive from the original experiment owner containing the model-linked dataset hash, split IDs, E3/E7 source or executable environment, row-level predictions and labels, and the original report. Until those artifacts are reconciled with the frozen checksums, historical metrics remain unreproduced.

## 7. Commands executed and outcomes

The audit was read-only until this report was created. No application, model, inference, calibration, protected test, checksum, or freeze-manifest file was changed.

| Command or operation | Outcome |
|---|---|
| `git status --short --untracked-files=all` | Existing user modifications and untracked files recorded and preserved |
| Repository inventory of `data`, `backend`, `scripts`, and `docs` | Candidate datasets, metadata, and reports inventoried; no `artifacts` directory exists in the repository |
| CSV header/row/label scan and SHA-256 calculation | Completed for IEEE-CIS train/test, PaySim, Credit Card Fraud, and frozen E7 CSV |
| Review of frozen `feature_schema.json`, `model_config.json`, `model_metadata.json`, calibration metadata, and README | Confirmed 22-feature E3/E7 contract, stateful preprocessing requirement, and unfinalized threshold |
| Review of existing provenance and evaluation reports | Confirmed prior bounded search and missing row-level E7/E2E evidence |
| Relevant Git history search | Frozen package history is present; no E3/E7 source, split manifests, or original E2E report recovered |
| Model evaluation on candidate datasets | **Not run intentionally** because no candidate passed compatibility and independence requirements |

## 8. Protected-file integrity

Protected hashes recorded before report creation:

| Protected path | SHA-256 |
|---|---|
| `backend/ml/deployment/inference/integrated_inference.py` | `03e9d40007b0ca72f49520567c76fa13f8104008a509ce54e738b7807a3f26c0` |
| `backend/ml/deployment/inference/production_feature_engineering.py` | `afafa91b4333a9060be04d7ffe7c59459cfeb8cca3ea2e90462195eefe5ae5d9` |
| `backend/ml/deployment/tests/test_inference_regression.py` | `3be8fe40b0923f0029a589ac48bd0d82bb77bcd8ae02e3543c9327c54590a51b` |
| `backend/ml/deployment/fraud_model_v1/checksums_sha256.json` | `45a8918b4254b9f2da2a4643dd83e5009adc9f1a83f6b1f86b9a37484098b05e` |
| `backend/ml/deployment/fraud_model_v1/deployment_freeze_manifest.json` | `4bba49ae9e38787018ee02bf46d11867ce72783c8ea763a7c5f88062f611cc53` |

The protected files and frozen package hashes remained unchanged during this audit. The deployment verifier was previously passing, and no protected file was edited by this work.

## 9. Limitations and unresolved questions

- The audit can establish what is present locally, not prove that unavailable external artifacts never existed.
- The local IEEE-CIS data may be historically related to the project, but the exact relationship to the frozen E3 model is not demonstrated.
- Historical aggregate metrics may be accurate, but they cannot be independently reproduced from the available evidence.
- No decision threshold was selected or inferred.

## 10. Final verdict

**NO SUITABLE LABELED DATASET FOUND.**

FraudLens has a verifiable software integration and frozen inference package, but this audit did not establish an independent labeled dataset compatible with that package. Actual predictive performance was therefore **not measured**, and claims about fraud-detection accuracy, calibration quality, precision, recall, F1, PR-AUC, ROC-AUC, false-positive rate, Brier score, or calibration error remain unverified for this audit.

The exact next action is to recover the model-linked E3/E7 dataset snapshot, split manifests, calibration cohort, row-level labeled predictions, and original evaluation report from the original experiment archive. Only after those artifacts are reconciled with `fraud_model_v1` should a frozen-pipeline evaluation runner be executed.
