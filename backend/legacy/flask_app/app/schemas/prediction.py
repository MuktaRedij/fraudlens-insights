"""Validation schema for raw Credit Card Fraud inference requests."""

from __future__ import annotations

import math
from numbers import Real
from typing import Any

from pydantic import BaseModel, ConfigDict, create_model, model_validator

from ..services.feature_engineering import RAW_INPUT_FEATURES


class RawTransactionBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def require_finite_numeric_values(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            raise ValueError("request body must be a JSON object")
        for field in RAW_INPUT_FEATURES:
            if field not in value:
                continue
            field_value = value[field]
            if isinstance(field_value, bool) or not isinstance(field_value, Real):
                raise ValueError(f"{field} must be numeric")
            if not math.isfinite(float(field_value)):
                raise ValueError(f"{field} must be finite")
        return value


RawTransaction = create_model(
    "RawTransaction",
    __base__=RawTransactionBase,
    **{field: (float, ...) for field in RAW_INPUT_FEATURES},
)
