"""Frozen-model inference service for Credit Card Fraud transactions."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import numpy as np

from .feature_engineering import FEATURE_ORDER, build_credit_card_features
from .model_loader import LoadedModel, ModelLoader

REVIEW_THRESHOLD = 54
HIGH_RISK_THRESHOLD = 88
CRITICAL_THRESHOLD = 94


class InferenceError(RuntimeError):
    """Raised when frozen-model inference cannot be completed safely."""


@dataclass(frozen=True)
class PredictionResult:
    raw_probability: float
    calibrated_probability: float
    risk_score: int
    risk_level: str
    model_version: str
    calibration_method: str
    explanation: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "success": True,
            "prediction": {
                "raw_probability": self.raw_probability,
                "calibrated_probability": self.calibrated_probability,
                "risk_score": self.risk_score,
                "risk_level": self.risk_level,
                "model_version": self.model_version,
                "calibration_method": self.calibration_method.lower(),
            },
            "explanation": self.explanation,
            "metadata": {
                "feature_count": len(FEATURE_ORDER),
                "inference_mode": "frozen_model",
            },
        }


def determine_risk_level(risk_score: int) -> str:
    if risk_score < REVIEW_THRESHOLD:
        return "LOW_RISK"
    if risk_score < HIGH_RISK_THRESHOLD:
        return "REVIEW"
    if risk_score < CRITICAL_THRESHOLD:
        return "HIGH_RISK"
    return "CRITICAL"


class PredictionService:
    """Run inference with the exact frozen model and calibration artifacts."""

    def __init__(self, loader: ModelLoader | None = None) -> None:
        self.loader = loader or ModelLoader()
        self._loaded: LoadedModel | None = None

    def _artifacts(self) -> LoadedModel:
        if self._loaded is None:
            self._loaded = self.loader.load()
        return self._loaded

    def predict(self, payload: dict[str, Any]) -> PredictionResult:
        loaded = self._artifacts()
        features = build_credit_card_features(payload)
        self._validate_feature_frame(features, loaded)

        try:
            raw_probability = float(np.asarray(loaded.model.predict(features)).reshape(-1)[0])
        except Exception as exc:
            raise InferenceError(f"Frozen LightGBM prediction failed: {exc}") from exc
        if not math.isfinite(raw_probability):
            raise InferenceError("Frozen LightGBM returned a non-finite probability.")
        raw_probability = float(np.clip(raw_probability, 0.0, 1.0))

        epsilon = np.finfo(float).eps
        clipped_probability = float(np.clip(raw_probability, epsilon, 1.0 - epsilon))
        logit_probability = math.log(clipped_probability / (1.0 - clipped_probability))
        try:
            calibrated_probability = float(
                np.asarray(loaded.calibrator.predict(np.array([[logit_probability]], dtype=float))).reshape(-1)[0]
            )
        except Exception as exc:
            raise InferenceError(f"Frozen Platt calibration failed: {exc}") from exc
        if not math.isfinite(calibrated_probability):
            raise InferenceError("Frozen Platt calibrator returned a non-finite probability.")
        calibrated_probability = float(np.clip(calibrated_probability, 0.0, 1.0))
        risk_score = int(round(calibrated_probability * 100))
        risk_score = max(0, min(100, risk_score))

        return PredictionResult(
            raw_probability=raw_probability,
            calibrated_probability=calibrated_probability,
            risk_score=risk_score,
            risk_level=determine_risk_level(risk_score),
            model_version="20F_smote_lightgbm",
            calibration_method="Platt",
            explanation=self._explain(loaded, features),
        )

    @staticmethod
    def _validate_feature_frame(features: Any, loaded: LoadedModel) -> None:
        if list(features.columns) != FEATURE_ORDER:
            raise InferenceError("Feature order does not match the frozen model contract.")
        if len(features.columns) != 37 or loaded.model.num_feature() != 37:
            raise InferenceError("Frozen LightGBM model must receive exactly 37 features.")
        metadata_order = loaded.feature_metadata.get("feature_columns")
        if metadata_order != FEATURE_ORDER or loaded.model.feature_name() != FEATURE_ORDER:
            raise InferenceError("Frozen model and feature metadata have incompatible feature order.")

    @staticmethod
    def _explain(loaded: LoadedModel, features: Any) -> dict[str, Any]:
        try:
            import shap

            explanation = shap.TreeExplainer(loaded.model)(features)
            values = np.asarray(explanation.values)
            if values.ndim == 3:
                values = values[0, :, -1]
            else:
                values = values.reshape(-1)
            ranked = sorted(
                zip(FEATURE_ORDER, values.tolist(), strict=True),
                key=lambda item: abs(float(item[1])),
                reverse=True,
            )[:5]
            return {
                "available": True,
                "top_contributors": [
                    {
                        "feature": feature,
                        "contribution": float(contribution),
                        "direction": "positive" if contribution >= 0 else "negative",
                    }
                    for feature, contribution in ranked
                ],
            }
        except Exception:
            return {
                "available": False,
                "top_contributors": [],
                "status": "unavailable",
            }
