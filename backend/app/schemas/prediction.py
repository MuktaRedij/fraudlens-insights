"""Raw-transaction request and frozen-prediction response schemas."""

from __future__ import annotations

import math
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RawTransaction(BaseModel):
    """Raw IEEE-CIS-style transaction; feature engineering stays in the frozen package."""

    model_config = ConfigDict(extra="allow")

    TransactionID: int | str
    TransactionDT: float
    TransactionAmt: float = Field(ge=0)

    @field_validator("TransactionID", mode="before")
    @classmethod
    def validate_transaction_id(cls, value: Any) -> Any:
        if isinstance(value, bool) or not isinstance(value, (int, str)):
            raise ValueError("TransactionID must be a non-empty string or integer")
        if isinstance(value, str) and not value.strip():
            raise ValueError("TransactionID must not be empty")
        return value

    @field_validator("TransactionDT", "TransactionAmt", mode="before")
    @classmethod
    def validate_finite_numeric(cls, value: Any) -> Any:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("value must be numeric")
        if not math.isfinite(float(value)):
            raise ValueError("value must be finite")
        return value


class PredictRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transaction: RawTransaction


class PredictionResponse(BaseModel):
    model_version: str
    transaction_id: int | str
    raw_probability: float
    calibrated_fraud_probability: float
