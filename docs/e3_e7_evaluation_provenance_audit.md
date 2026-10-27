# E3/E7 evaluation provenance audit

**Audit date:** 2026-10-18
**Repository:** `C:\Users\Mukta\Downloads\fraudlens-insights`
**Scope:** Recover the documented provenance and reproducibility of deployed `fraud_model_v1` (base experiment E3, calibration experiment E7). No model, calibration, feature code, test, threshold, or frozen artifact was changed.

## Executive summary

The repository contains a frozen LightGBM package and metadata associating it with base experiment **E3** and Platt calibration experiment **E7**. It records training/validation counts, calibration parameters, aggregate validation metrics, artifact hashes, and a 20-row inference-reproducibility export. The deployed inference source shows a 22-feature, stateful pipeline; it computes features from prior state, then updates state, and applies Platt calibration to the logit of the raw probability.

The original E3 training and E7 evaluation/calibration scripts, source dataset manifest/hash, exact split-generation code, split row IDs, and row-level E7 validation export were **not found in the repository or the specifically documented sibling artifact directory**. The deployment manifest points to an E2E report under a Colab path, but the report itself was not found in the searched locations. These are bounded search results—not proof that the files never existed.

The deployed package records 472,432 training rows and 118,108 validation rows (590,540 total). The local IEEE-CIS labeled transaction file has 193,540 rows and its metadata describes a chronological 70/15/15 split into 135,478/29,031/29,031 rows. These populations and split descriptions do not reconcile. Moreover, none of the 20 transaction IDs in the local frozen inference reproducibility CSV matched the local IEEE-CIS labeled training file. No dataset or split identity can therefore be asserted from the available evidence.

**Conclusion:** the reported E3/E7 figures are stored historical validation results, not independently established held-out test results. I could reproduce the frozen Platt calibration output for the 20 raw probabilities in the separate inference reproducibility CSV to a maximum absolute difference of `1.0061396160665481e-16`; that file has no labels and does not reproduce the historical E7 metrics or the E2E run. The deployed model’s evaluation population and an independent held-out labeled cohort remain unverified. No new performance metric was calculated.

## Repository and search scope

Inspected:

- `README.md`, `backend/README.md`, `docs/ml/frozen-model.md`, `docs/research/README.md`, and the existing `docs/model_evaluation_data_audit.md`.
- The model package under `backend/ml/deployment/fraud_model_v1/`, inference source under `backend/ml/deployment/inference/`, protected regression test, and `backend/ml/deployment/inference_tests/`.
- `data/raw/` and `data/processed/`, including IEEE-CIS, Credit Card Fraud, and PaySim raw data and experiment metadata.
- `scripts/`, repository file inventory for Python, notebooks, and logs, and reachable local Git history.
- The exact export/report paths named in the protected test and freeze manifest, plus the documented sibling path `C:\Users\Mukta\Downloads\fraudlens_artifacts`.

The requested report path did not exist before this audit. The pre-existing `docs/model_evaluation_data_audit.md` was inspected and left unchanged. The documented sibling artifact directory was not present. The repository inventory showed no notebooks, training/evaluation scripts, or run logs; `scripts/` contains `verify_deployment.py` and the unrelated `test_spa_routes.py`.

The reachable Git history includes baseline commit `5f5a4bf` adding the frozen package, metadata, and regression test. Its tree contains deployment artifacts and experiment output files, but no E3 training script, E7 fitting/evaluation script, raw dataset snapshot, split-ID manifest, or original E2E report. Local Git history does not establish that no such files exist outside the searched refs or storage.

## Reconstructed E3/E7 pipeline (metadata-level reconstruction)

1. **E3 model:** `model_config.json` identifies `base_experiment: E3`, LightGBM, 22 features, target `isFraud`, balanced class weighting, 472,432 training rows, and 16,599 training frauds. It records 118,108 validation rows and 4,064 validation frauds. The feature names and raw inputs are IEEE-CIS-like, but the config does not name a source dataset/version or data hash. See [`model_config.json`](../backend/ml/deployment/fraud_model_v1/model_config.json#L1-L65) and [`model_metadata.json`](../backend/ml/deployment/fraud_model_v1/model_metadata.json#L1-L52).
2. **Feature construction and inference:** the frozen feature schema contains raw `TransactionDT`/`TransactionAmt`, temporal fields, and history-derived card/address/email fields. [`production_feature_engineering.py`](../backend/ml/deployment/inference/production_feature_engineering.py#L32-L54) enforces the 22-feature order. `transform()` computes features using state already present and calls `_update_state()` only afterward; the global temporal state rejects a timestamp earlier than its previous timestamp. See [`production_feature_engineering.py`](../backend/ml/deployment/inference/production_feature_engineering.py#L384-L410) and [`production_feature_engineering.py`](../backend/ml/deployment/inference/production_feature_engineering.py#L624-L778). The inference wrapper calls this transformer, predicts with the frozen Booster, then calibrates the raw output; see [`integrated_inference.py`](../backend/ml/deployment/inference/integrated_inference.py#L223-L300).
3. **E7 calibration:** `model_config.json` and `model_metadata.json` name `calibration_experiment: E7`. `calibration_config.json` records Platt scaling (`platt_v1`), input source “E3 LightGBM raw probability,” coefficient `0.8501956283863521`, intercept `-2.587345250190834`, and `fitted_without_final_validation_labels: true`. `integrated_inference.py` clips the raw probability to `[1e-15, 1-1e-15]`, takes its logit, and calls the frozen calibrator. See [`calibration_config.json`](../backend/ml/deployment/fraud_model_v1/calibration_config.json#L1-L31) and [`integrated_inference.py`](../backend/ml/deployment/inference/integrated_inference.py#L149-L220).
4. **Reported evaluation:** the package records validation metrics for raw E3 probabilities and Platt-calibrated E3 probabilities under E7. The metadata has no split IDs or per-row labels/predictions supporting independent recomputation. It reports `final_validation_used_for_calibration: false`; the package README says the final validation period was not used to fit calibration. This supports the stated calibration separation only as a metadata assertion; it does not identify the exact calibration-fit cohort or prove a separate final test split.
5. **Decision policy:** `threshold_config.json` says `status: not_finalized` and `default_threshold: null`. Platt calibration transforms probabilities; it does not choose an operating threshold or establish fraud/legitimate decisions. No threshold was changed or calculated.

The above reconstructs the package’s stated path and deployed inference behavior. It does **not** recover how E3’s training rows, E7’s calibration rows, or the reported validation rows were selected.

## Evidence table

| Claim or artifact | Evidence location | Evidence found | Verification performed | Status | Remaining uncertainty |
|---|---|---|---|---|---|
| Deployed version is `fraud_model_v1`, based on E3 LightGBM and E7 Platt calibration | [`model_config.json`](../backend/ml/deployment/fraud_model_v1/model_config.json#L1-L8), [`model_metadata.json`](../backend/ml/deployment/fraud_model_v1/model_metadata.json#L1-L12) | Version, model type, base experiment, and calibration experiment fields | Read package metadata; final trusted checksum verifier passed | **VERIFIED** as the package’s declared identity | No source training code or run record independently ties the model bytes to a training invocation |
| Exact original dataset/version and dataset hash are known | Model config/metadata, freeze manifest, and raw data metadata | Target and IEEE-like input fields are recorded; no deployed-model dataset name/version or raw source file hash is recorded | Searched package configs/manifests and dataset metadata | **NOT FOUND** | Dataset may be stored elsewhere; this audit cannot determine whether it ever existed |
| E3 training/validation row counts are reproducible from a known split | [`model_config.json`](../backend/ml/deployment/fraud_model_v1/model_config.json#L44-L54), [`model_metadata.json`](../backend/ml/deployment/fraud_model_v1/model_metadata.json#L45-L52) | 472,432 training / 16,599 fraud; 118,108 validation / 4,064 fraud; freeze metadata records 590,540 processed rows | Compared counts with checked-in IEEE-CIS audit and feature-split metadata | **PARTIALLY VERIFIED** | The counts sum to 590,540 (an 80/20 arithmetic split), but no split code, boundary, seed, IDs, or source hash identifies those rows |
| Local labeled IEEE-CIS data is the deployed model’s training/evaluation population | [`ieee_cis_dataset_audit.json`](../data/processed/ieee_cis/ieee_cis_dataset_audit.json#L1-L32), [`ieee_cis_feature_engineering_metadata.json`](../data/processed/ieee_cis/ieee_cis_feature_engineering_metadata.json#L24-L54) | Local labeled train table 193,540 rows; split metadata says 135,478 train / 29,031 validation / 29,031 internal test, chronological 70/15/15 | Read raw CSV target/time/id columns; reconciled totals and ranges; checked fixture IDs against the local labeled train CSV | **CONTRADICTED** as an equality claim | The local file may be a different subset/version/filter, but there is no provenance evidence to decide which |
| The 20 inference reproducibility IDs tie to the local IEEE-CIS labeled train rows | [`prediction_reproducibility.csv`](../backend/ml/deployment/inference_tests/prediction_reproducibility.csv#L1-L21), local `data/raw/ieee_cis/train_transaction.csv` | The fixture has 20 IDs and raw/expected-calibrated predictions but no target labels | Joined the fixture IDs to local IEEE-CIS `TransactionID`; 0 of 20 matched | **CONTRADICTED** for the local file | The original source transactions might exist elsewhere; these IDs do not identify local split membership |
| The 22-feature schema and no-future-history inference semantics are present | [`feature_schema_normalized.json`](../backend/ml/deployment/fraud_model_v1/feature_schema_normalized.json#L1-L100), [`production_feature_engineering.py`](../backend/ml/deployment/inference/production_feature_engineering.py#L624-L778) | Ordered 22 features; state used for feature construction; current record added after transform; backward global timestamps rejected | Inspected frozen implementation and compared its hash to manifest | **VERIFIED** for current inference implementation | The absent training transformation/replay source and split boundaries prevent proving training-time parity or non-contamination across splits |
| The frozen aggregate E3/E7 values exist | [`E7_raw_vs_calibrated_comparison.csv`](../backend/ml/deployment/fraud_model_v1/E7_raw_vs_calibrated_comparison.csv#L1-L3), [`model_metadata.json`](../backend/ml/deployment/fraud_model_v1/model_metadata.json#L1-L10), [`calibration_config.json`](../backend/ml/deployment/fraud_model_v1/calibration_config.json#L20-L31) | Historical raw/calibrated AP, ROC-AUC, Brier, log-loss, and ECE values are stored and labeled E7/validation in metadata | Compared matching aggregate values across package files; did not recompute metrics | **PARTIALLY VERIFIED** | Original labels, prediction rows, metric code/version, exact evaluation cohort, and source split membership are absent |
| Historical E3/E7 values are held-out test results | Package metrics and metadata | The relevant package fields call them validation metrics; no deployed-model held-out test counts, labels, IDs, or test metric cohort is specified | Compared model/calibration metadata with freeze manifest and available IEEE-E1 test summary | **CONTRADICTED** as a claim supported by these artifacts | An unlocated external report could exist, but it is not evidence available to this audit |
| E7 row-level validation prediction export is available locally | Protected test references `artifacts/models/E7_calibration/e7_validation_predictions.csv`; repository search; `C:\Users\Mukta\Downloads\fraudlens_artifacts` | The named CSV was not in repository/data/backend or sibling path. The similarly named frozen CSV is aggregate-only. | Enumerated/search-scanned the repository and checked the explicitly referenced sibling artifact directory (absent) | **NOT FOUND** | A failed bounded search is not proof the export never existed or is unavailable in other storage |
| E2E report can be inspected locally | [`deployment_freeze_manifest.json`](../backend/ml/deployment/fraud_model_v1/deployment_freeze_manifest.json#L22-L34), protected test reference | Manifest embeds a PASS summary and a Colab path to `e2e_inference_integration_report.json`; the report file itself was not found locally | Searched repository and checked the documented sibling artifact directory | **NOT FOUND** | Embedded manifest fields are claims, not the full report or its inputs/logs |
| Existing 20-row inference reproduction fixture reproduces calibration | [`prediction_reproducibility.csv`](../backend/ml/deployment/inference_tests/prediction_reproducibility.csv#L1-L21), frozen calibrator | The fixture contains raw and expected calibrated predictions, no labels | Loaded frozen calibrator and applied the production logit/clipping contract to each expected raw value; 20 rows; max absolute difference `1.0061396160665481e-16`, below `1e-12` | **VERIFIED** for this small probability-calibration fixture | Does not recompute model raw predictions from transactions, reproduce E7 metrics, validate fraud accuracy, or establish held-out status |
| Any operational threshold is finalized | [`threshold_config.json`](../backend/ml/deployment/fraud_model_v1/threshold_config.json#L1-L7) | `not_finalized`, `default_threshold: null` | Read config and verified package checksum | **VERIFIED** | No business-cost/capacity policy is included; threshold remains unset |
| Original E3/E7 training/evaluation scripts and notebooks exist in repository history | `scripts/`, repository file inventory, reachable local Git history including commit `5f5a4bf` | No model training/evaluation script or notebook was present; the baseline commit contains frozen artifacts, metadata, and tests | Listed repository scripts/notebooks/logs; inspected history file names and relevant commit contents | **NOT FOUND** | Only searched local repository and reachable refs; external/private storage and un-fetched history were not searched |

## Dataset and model provenance

The deployed model’s target is recorded as `isFraud`, and its features include `TransactionDT`, `TransactionAmt`, `card1`, `addr1`, and `P_emaildomain`-derived behavior. That is consistent with an IEEE-CIS-style raw interface, but the deployed model metadata does not name IEEE-CIS, identify a version/download record, or record an input-file checksum. **Dataset identity is therefore not verified.**

The local IEEE-CIS audit describes:

- 193,540 labeled train transactions, target `isFraud`, 5,689 frauds (2.9394%), `TransactionDT` 86,400–4,358,367.
- A 70/15/15 chronological train/validation/internal-test partition, with windows and counts in the split metadata.
- Zero `TransactionID` overlap between that local labeled train file and its competition test feature file.

Those local facts do not establish the deployed model’s split membership. The competition test `sample_submission.csv` contains placeholder `0.5` values, not labels. The distinct IEEE-E1 metadata/test summary describes a 399-feature model and a 70/15/15 split; it is not evidence of the deployed 22-feature model’s test score. PaySim E2 and Credit Card Fraud 20J outputs likewise belong to other models and feature contracts.

The deployed counts are not reconcilable from present records: its training plus validation population is 590,540, while the local IEEE-CIS labeled table is 193,540. The local split totals 193,540 and documents 70/15/15; the frozen counts total 590,540 and divide arithmetically into 80/20. No row-ID lists, content hashes, filters, or split-generation program prove these populations are equivalent or disjoint. In addition, none of the 20 IDs in the inference fixture was found in the local IEEE-CIS train file.

## Historical metrics and reproducibility

The frozen package records the following **historical validation values**, not metrics measured during this audit:

| Output described in package | Average precision / PR-AUC | ROC-AUC | Brier | Log loss | 10-bin ECE |
|---|---:|---:|---:|---:|---:|
| Raw E3 | 0.164383 | 0.762803 | 0.112180 | 0.374520 | 0.237258 |
| E3 after E7 Platt calibration | 0.164383 | 0.762803 | 0.030997 | 0.131387 | 0.006222 |

The metadata identifies these as validation metrics; ECE is the configured ten-bin expected calibration error. No calculation was repeated because the original prediction/label rows and evaluation code/cohort were not available. These values do not prove performance on an independent final test population.

The calibrator computation itself is reproducible on the 20 raw/expected-calibrated pairs in `prediction_reproducibility.csv` to the tolerance above. That file is not the referenced E7 CSV: it does not include the E7 test's raw row feature inputs or labels. The frozen aggregate comparison CSV has only two rows of summary metrics. Neither artifact permits recomputing average precision, ROC-AUC, Brier, log loss, or ECE.

Platt calibration maps model probability to a calibrated probability. It is not threshold selection. The deployment threshold remains `null`; no decisions or threshold-specific metrics can be inferred from this audit.

## Missing artifacts and consequences

The protected regression test at [`test_inference_regression.py`](../backend/ml/deployment/tests/test_inference_regression.py#L13-L49) defaults `FRAUD_PROJECT_ROOT` to `/content/drive/MyDrive/fraud-detection-platform`, then looks for:

- `artifacts/models/E7_calibration/e7_validation_predictions.csv`
- `artifacts/evaluation/end_to_end_inference/e2e_inference_integration_report.json`
- An `artifacts/deployment/inference/integrated_inference.py` import location.

The current Windows checkout instead has frozen modules under `backend/ml/deployment/inference/`. The original protected test was rerun without modification and produced **3 setup errors**, all `ModuleNotFoundError: No module named 'integrated_inference'`. Thus its assertions did not execute in this environment. Independently, the row-level CSV and full E2E JSON are absent from the repository and checked sibling location. The manifest’s embedded `e2e_overall_pass: true` and error summaries are historical assertions that cannot be independently inspected here.

This result means the original historical E3/E7 evaluation is **not reproducible from this checkout**. It does not show that the evaluation never occurred, nor does it show a defect in current frozen inference behavior.

## Concrete next steps

1. Recover from the original project storage the exact input-data snapshot and immutable hash, original E3 training/feature-generation code, E7 calibration/evaluation code, split generation code and seed/boundaries, and train/validation/calibration/test transaction-ID manifests.
2. Recover the actual E7 row-level prediction export with ground-truth labels and the full E2E report/logs, plus the raw transaction rows or auditable source reference needed to reproduce raw E3 predictions.
3. Reconcile those artifacts against `fraud_model_v1` hashes and the recorded 590,540-row population. Explicitly establish which rows were used to fit LightGBM, fit Platt calibration, select any operating point, and produce each reported metric.
4. Only if a chronologically later, labeled, feature-compatible cohort is shown to be disjoint from all fitting/selection data, build a separate read-only evaluation runner that invokes the frozen production feature pipeline with permitted prior history. Otherwise, request a new governed evaluation cohort; do not repurpose incompatible public-dataset test outputs.
5. Keep the threshold unset until a separate policy decision is supported by operational costs/capacity. Do not tune it on a final test cohort.

## Commands and checks performed

- `git status --short` (via repository status): initial worktree had extensive modified, deleted, and untracked files, including user data and deployment contents. They were preserved.
- `& '.\.venv-1\Scripts\python.exe' scripts\verify_deployment.py` before audit: **passed**, 11 deployment artifact hashes, two inference-module hashes, and the protected regression-test hash matched.
- Repository search for E3/E7, model IDs, prediction/report names, and provenance terms across README/docs, backend model files, scripts, tests, and processed data; searches and directory inventory found metadata/output files but no training/evaluation program, notebook, or run log.
- Exact-file search in `C:\Users\Mukta\Downloads\fraudlens_artifacts`: **NOT FOUND**; the documented directory itself was absent.
- `git --no-pager log --all --oneline --grep='E3\|E7\|fraud_model_v1\|calibration' -i`: returned no relevant E3/E7 pipeline commits (matching commit subjects were unrelated). `git diff-tree`/`git ls-tree` inspection of reachable baseline commit `5f5a4bf` showed deployment snapshots and existing outputs, not the original training/evaluation sources.
- Raw IEEE-CIS population audit with `.venv-1` pandas: **193,540** labeled train rows; the 20 inference-fixture transaction IDs matched **0** rows.
- Frozen calibration-only reproduction using the 20 existing expected raw values: **20 records**, max absolute calibrated-probability difference `1.0061396160665481e-16` (within `1e-12`); fixture contains no ground-truth labels.
- `& '.\.venv-1\Scripts\python.exe' -m pytest backend\ml\deployment\tests\test_inference_regression.py -q`: **3 setup errors**, each caused by `ModuleNotFoundError: No module named 'integrated_inference'`; evaluation assertions did not run.
- `git diff --check`: **passed** (exit code 0; Git emitted a line-ending warning for pre-existing `AGENTS.md`). The new report is untracked, so it is not included in the Git diff check; a separate whitespace scan of the report also passed after removing Markdown hard-break trailing spaces.
- `& '.\.venv-1\Scripts\python.exe' scripts\verify_deployment.py`: **passed** after report creation; all 11 frozen deployment files, both inference modules, and the protected regression-test hash matched (100%).

**Scope limitation:** the search covered this repository, its reachable local Git history, and the manifest/test’s specifically documented sibling artifact path. It did not search arbitrary drives, remote/unfetched Git refs, cloud storage, or the original Colab filesystem. “Not found” above is limited to the scope actually searched.
