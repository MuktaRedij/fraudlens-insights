# FraudLens evaluation data and provenance audit

**Audit date:** 2026-10-12  
**Question:** Can the checked-in data support a new, reproducible, genuinely held-out evaluation of frozen `fraud_model_v1`?

## Conclusion

**No. No new evaluation runner or model-quality report was created.** The datasets with labels and documented temporal test splits use incompatible models/features. The IEEE-CIS competition test records have no genuine labels. The labeled IEEE-CIS data in this checkout has a material provenance/count mismatch with the deployed model's recorded training and validation population, and the available IEEE internal-test metrics belong to a different 399-feature E1 model. A runner that scored any of these as a held-out test for `fraud_model_v1` would not be defensible.

No labels, prediction rows, split assignments, or metrics were created or inferred. Historical metrics listed below are metadata only, not results of this audit.

## Dataset inventory

| Dataset / files | Source and labels | Observed size, prevalence, time, and identifiers | Split/evaluation lineage | Disposition for `fraud_model_v1` |
|---|---|---|---|---|
| IEEE-CIS raw `data/raw/ieee_cis/train_transaction.csv`, `train_identity.csv` | IEEE-CIS Fraud Detection metadata identifies target `isFraud`; transaction and identity tables join on `TransactionID`. No local download hash/source manifest was found. | Raw CSV inspection: 193,540 labeled transaction rows, 5,689 frauds (2.9394%); `TransactionDT` 86,400–4,358,367; 193,540 unique `TransactionID`s. Identity file has 144,233 rows. The audit reports 35.61% train identity coverage. | `ieee_cis_feature_engineering_metadata.json` describes a chronological 70/15/15 split: train 135,478 / 3,490 fraud; validation 29,031 / 1,046; internal test 29,031 / 1,153. The internal test window is `TransactionDT` 3,510,175–4,358,367. Its test summary explicitly names IEEE-E1, with 399 features, not the deployed model. The same audit reports no `TransactionID` overlap between its raw train and competition-test transaction files. | Exclude as an evaluation set for the deployed model: the model metadata records 472,432 training rows plus 118,108 validation rows (590,540 total), which does not match the 193,540 labeled rows in this checkout. No training-row identifiers, input dataset hash, or reconciled source/split manifest establishes disjointness. In addition, the checked-in internal-test prediction/evaluation metadata is for the different 399-feature E1 pipeline. |
| IEEE-CIS raw `test_transaction.csv`, `test_identity.csv`, `sample_submission.csv` | Competition test feature files have no `isFraud` target. `sample_submission.csv` contains placeholder `isFraud` values of `0.5`, not ground truth. | Raw CSV inspection: 198,908 test transactions, 198,908 unique IDs; `TransactionDT` 18,403,224–25,323,393; identity rows 141,907. | Competition test labels are explicitly unavailable in `ieee_cis_feature_engineering_metadata.json`; the audit states the competition test was not used for evaluation or selection. | Not evaluable: placeholder scores are not labels. |
| PaySim raw `data/raw/paysim/PS_20174392719_1491204439457_log.csv` | PaySim synthetic mobile-money simulation; label `isFraud`; `isFlaggedFraud` is a separate system flag, not the target. Account identifiers are `nameOrig` and `nameDest`. No independent download checksum/provenance manifest was found. | Raw CSV inspection and `paysim_audit_summary.json`: 6,362,620 rows, 8,213 frauds (0.1291%); `step` 1–743; 6,353,307 unique origin accounts and 2,722,362 unique destinations. | `temporal_split_audit.csv` records step-disjoint train 1–595 (6,244,474 / 6,571 fraud), validation 596–670 (51,526 / 816 fraud), test 671–743 (66,620 / 826 fraud). The E2 test summary describes validation-derived thresholds and a PaySim E2 model. | Exclude: PaySim E2 uses a separate 17-feature transaction/account schema and model, not the deployed IEEE-CIS 22-feature pipeline. Its historical test metrics are not transferable. |
| Credit Card Fraud raw `data/raw/credit_card_fraud/creditcard.csv` | Download metadata identifies a Zenodo mirror of the ULB/Kaggle Credit Card Fraud dataset (record 7395559); target `Class` (`1` fraud, `0` legitimate). No entity/card identifiers are present in the documented 31-column table. | Raw CSV inspection: 284,807 rows, 492 frauds (0.17275%); `Time` 0–172,792 seconds. Audit reports 1,081 exact duplicate rows. | `credit_card_temporal_split_metadata.json` documents chronological positional train 199,364 / 384 fraud, validation 42,721 / 56 fraud, test 42,722 / 52 fraud. The 20J report describes a separate 37-feature V1–V28/Amount/Time LightGBM model, with SMOTE on training only and thresholds selected on validation. | Exclude: its raw feature contract and model are incompatible with the 22 IEEE behavioral features. The recorded 20J held-out results are for that other model only. |

Processed prediction files and experiment summaries under `data/processed/` are historical outputs for the Credit Card Fraud, PaySim, or IEEE-E1 experiments. The frozen inference reproducibility CSV under `backend/ml/deployment/inference_tests/` compares 20 expected and actual predictions but contains no ground-truth fraud labels; it demonstrates prediction reproducibility, not accuracy.

## Deployed model, split, and feature-contract evidence

- `backend/ml/deployment/fraud_model_v1/model_metadata.json` identifies LightGBM `fraud_model_v1`, target `isFraud`, and exactly 22 ordered features. These include IEEE-CIS raw fields and prior-only behavioral history: `TransactionDT`, `TransactionAmt`, `card1`, `addr1`, and `P_emaildomain` feed the frozen feature engineer.
- The same metadata records 472,432 training rows (16,599 fraud) and 118,108 validation rows (4,064 fraud), totaling **590,540**. The freeze manifest also records `processed_rows: 590540`. The local labeled IEEE-CIS CSV has **193,540** rows, and no checked-in training IDs or dataset checksum connects the local rows to the frozen model's fit/validation membership.
- The metadata identifies calibration experiment E7 and verifies the calibrator against E7 validation predictions. The frozen `E7_raw_vs_calibrated_comparison.csv` contains only aggregate metrics; the referenced row-level `e7_validation_predictions.csv` and E2E report were not found under the repository, `data/`, `backend/`, or the referenced sibling artifact directory.
- The production feature engineer requires chronological transactions and computes history only from previously observed transactions. Its process state starts empty; no frozen training-history snapshot or approved held-out replay protocol is included. Reconstructing history requires an authorized, correctly ordered pre-evaluation context from the same source population. Future rows and labels must not be used to build features.
- The separate IEEE-E1 split artifacts report a chronological 70/15/15 split and 399 input features. Those split records cannot be assumed disjoint from `fraud_model_v1` training: the deployed model's 590,540-row population and the local audit's 193,540-row population are not reconciled by source hashes or ID manifests.

## Historical values are not newly measured

The deployed `model_metadata.json` records historical E3/E7 validation values: calibrated PR-AUC / average precision 0.164383, ROC-AUC 0.762803, Brier score 0.030997, and 10-bin ECE 0.006222. These were not recomputed during this audit and do not constitute a new independent held-out test evaluation. The frozen threshold configuration remains `not_finalized` with `default_threshold: null`; no decision threshold was inferred or selected.

Other stored test metrics (IEEE-E1, PaySim E2, Credit Card 20J, and related model experiments) are intentionally not repeated as performance evidence for the deployed 22-feature model.

## Prerequisites for a defensible evaluation

Before adding a runner or reporting new metrics, obtain and document:

1. The exact labeled source snapshot used to train/finalize `fraud_model_v1`, including immutable dataset hash/version, target definition, source IDs, and train/validation/calibration memberships.
2. A genuine labeled evaluation cohort that is chronologically later and provably disjoint from model fitting, feature selection, calibration, and threshold selection. Resolve the 590,540-versus-193,540 IEEE-CIS count/source discrepancy.
3. Raw columns required by the deployed feature engineer and a defined chronological history warm-up protocol using only allowed records before each scored row.
4. A separate validation-derived operating point only if business costs or review capacity justify threshold metrics; do not tune that point on the final evaluation cohort.
5. An evaluation artifact manifest documenting source hashes, split boundaries, row IDs or disjointness proof, model/checksum verification, metric definitions, and evaluation command.

Until these prerequisites exist, reporting newly measured PR-AUC, ROC-AUC, threshold precision/recall/F1, Brier score, or calibration curves for `fraud_model_v1` is not supported.
