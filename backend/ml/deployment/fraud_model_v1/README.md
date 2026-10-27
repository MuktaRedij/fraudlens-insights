# Fraud Detection Model — Deployment Package

Model version: fraud_model_v1

## Model

Base experiment: E3
Model: LightGBM
Features: 22

## Calibration

Calibration experiment: E7
Method: Platt scaling

The calibrated output is:

`calibrated_fraud_probability`

Range:

`0.0` to `1.0`

## Feature contract

The inference system must provide the exact 22 features
listed in `feature_schema.json`.

Feature order must be preserved.

Missing and infinite model inputs are not permitted.

## Leakage control

Behavioral features must be calculated using only
transactions available before the transaction being scored.

The final validation period was not used to fit the
calibration model.

## Decision threshold

No final operational threshold is included in this package.

The backend should expose the calibrated probability
until the decisioning/operating-point stage defines the
threshold policy.

## Artifacts

- model/lightgbm_behavioral.txt
- calibration/platt_calibrator.joblib
- feature_schema.json
- model_config.json
- calibration_config.json
- threshold_config.json
- model_metadata.json
- checksums_sha256.json

## Validation

Raw E3 PR-AUC: 0.164383
Raw E3 ROC-AUC: 0.762803
Raw E3 Brier: 0.112180

Calibrated PR-AUC: 0.164383
Calibrated ROC-AUC: 0.762803
Calibrated Brier: 0.030997
Calibrated Log Loss: 0.131387
Calibrated ECE: 0.006222
