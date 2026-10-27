# Frozen Machine Learning Model (`fraud_model_v1`)

## Overview

The active inference pipeline in FraudLens relies exclusively on the frozen **`fraud_model_v1`** deployment package. Its freeze manifest and checksums support artifact-integrity and inference-reproducibility checks; those checks do not establish independent held-out model performance. The locally available metadata describes training and validation results, and no compatible independent labeled test set was available for this validation run.

## Model Contract

| Property | Value / Specification |
| :--- | :--- |
| **Model Version** | `fraud_model_v1` |
| **Classifier** | LightGBM (Gradient Boosted Decision Trees) |
| **Model Artifact** | `backend/ml/deployment/fraud_model_v1/model/lightgbm_behavioral.txt` |
| **Feature Count** | Exactly 22 input features (strict ordering required) |
| **Calibration Method** | Platt Scaling (Logistic Regression) |
| **Calibration Input** | `logit(raw_probability)` |
| **Calibrator Artifact**| `backend/ml/deployment/fraud_model_v1/calibration/platt_calibrator.joblib` |
| **Operational Threshold** | **None** (unfinalized; raw & calibrated probabilities exposed without thresholding) |

## Exact 22-Feature Schema and Order

The LightGBM model strictly requires the following 22 features in this exact numerical sequence without omission, nulls, or infinite values:

1. `TransactionDT` (Numeric) - Timestep delta from reference epoch
2. `TransactionAmt` (Numeric) - Raw transaction monetary value
3. `transaction_hour` (Numeric) - Extracted hour of day [0, 23]
4. `transaction_day` (Numeric) - Extracted day of month
5. `transaction_week` (Numeric) - Extracted week index
6. `transaction_day_of_week` (Numeric) - Day of the week [0, 6]
7. `hour_sin` (Numeric) - Sinusoidal hour cyclical encoding: `sin(2π * hour / 24)`
8. `hour_cos` (Numeric) - Cosine hour cyclical encoding: `cos(2π * hour / 24)`
9. `amount_log1p` (Numeric) - Log-transformed transaction amount: `log1p(TransactionAmt)`
10. `time_since_previous_transaction` (Numeric) - Global time delta since preceding transaction
11. `has_previous_transaction` (Numeric) - Binary indicator of previous transaction existence
12. `card1_prev_count` (Numeric) - Transaction frequency for `card1` entity
13. `card1_prev_amount_mean` (Numeric) - Historical mean amount for `card1`
14. `card1_prev_amount_std` (Numeric) - Historical standard deviation of amount for `card1`
15. `card1_prev_amount_deviation` (Numeric) - Amount deviation from entity mean: `(Amt - Mean) / (Std + 1e-5)`
16. `card1_time_since_previous` (Numeric) - Time delta since entity's previous transaction
17. `addr1_prev_count` (Numeric) - Transaction frequency for `addr1` location
18. `email_prev_count` (Numeric) - Transaction frequency for `P_emaildomain`
19. `card1_addr1_prev_count` (Numeric) - Transaction frequency for composite `card1_addr1` key
20. `card1_has_history` (Numeric) - Indicator if `card1` entity has prior history
21. `card1_amount_history_available` (Numeric) - Indicator if amount statistics are available
22. `card1_time_history_available` (Numeric) - Indicator if timing statistics are available

## Feature Engineering and Leakage Prevention

- **Stateful Engine**: Handled by `backend/ml/deployment/inference/production_feature_engineering.py`.
- **Chronological Ordering**: Transactions must arrive in ascending `TransactionDT` order. Future transactions are strictly unavailable during scoring to prevent temporal data leakage.
- **Entity State**: In-memory historical state is maintained per entity (`card1`, `addr1`, `P_emaildomain`).

## Calibration Mathematics

Raw LightGBM margin outputs or raw tree probabilities undergo Platt probability calibration:

1. **Probability Clipping**:
   $$\hat{p}_{\text{clipped}} = \text{clip}(p_{\text{raw}}, 10^{-15}, 1 - 10^{-15})$$
2. **Logit Transformation**:
   $$z = \text{logit}(\hat{p}_{\text{clipped}}) = \ln\left(\frac{\hat{p}_{\text{clipped}}}{1 - \hat{p}_{\text{clipped}}}\right)$$
3. **Platt Sigmoid Calibration**:
   $$p_{\text{calibrated}} = \sigma(A \cdot z + B)$$
   Where $A$ and $B$ are parameters fitted via maximum likelihood on validation folds using scikit-learn's `LogisticRegression`.

## Decision Threshold Policy

In accordance with deployment specifications:
- **No operational threshold is included** or invented in this package.
- The API explicitly returns `raw_probability` and `calibrated_fraud_probability`.
- Automated decisions (Approve, Review, Decline) and custom risk bands are deferred to operating-point determination and analyst risk policy configuration.

## Frozen Artifact Checksums (SHA-256)

All 11 deployment artifacts are cryptographically locked in `checksums_sha256.json`:

```json
{
  "E7_raw_vs_calibrated_comparison.csv": "8f6e8239e079f6e29ff26596a57b3a9fb693138d865b0c1292c273c02adb1a0c",
  "README.md": "6754cf52e25bce9bdd5ec37f801a30ae54af3fdccc710bae5f770508ea1c0660",
  "calibration/platt_calibrator.joblib": "9f31578f37386509b72534c2522145f71ed6f3b0360a2151993c1b395ac932a9",
  "calibration_config.json": "9d5e5be24124958eee443b7a5dfa5d7b093ad24d3a9fd4e162de39f4d993d252",
  "feature_schema.json": "a8337f8dcd2f4497e592d4f84670e9624341bb5ea215a9f339ef783ce7a04a17",
  "feature_schema_normalized.json": "697e31ff0ded520d139b6de2dc7b57b999ebb55bd98574593d7c56a544cfe64f",
  "model/lightgbm_behavioral.txt": "8db27d6c1b2c35a9ac2ad5f66b66ef88078ff8dfa33f639e874bdceb5ba78009",
  "model_config.json": "a61383c9de5f6c3da40a1b14f8bc7f1d07f79232cefc210c857853c4325350b6",
  "model_metadata.json": "da964424f1120f2e02d640b73957598bddf44291495bdd2302668bc3a4670185",
  "model_metadata.json.pre_freeze_backup": "5cd3dbddf9ee021d478fc8fb5e813ee4694fed54c4cb6bd05683269571cfe064",
  "threshold_config.json": "c851c64f05931a31d1f38ca3c57a26c4817c4e81e6399f212839c76997b39dc2"
}
```

Any tampering, unintended modification, or regeneration of these files causes startup failure in `InferenceService` (HTTP 503).
