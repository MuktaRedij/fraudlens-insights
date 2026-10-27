"""Credit Card Fraud feature engineering for frozen-model inference."""

from __future__ import annotations

import math
from collections.abc import Mapping
from typing import Any

import pandas as pd

RAW_INPUT_FEATURES = [*(f"V{i}" for i in range(1, 29)), "Amount", "Time"]
ENGINEERED_FEATURES = [
    "log_amount",
    "time_hours",
    "time_days",
    "day_index",
    "hour",
    "hour_sin",
    "hour_cos",
]
FEATURE_ORDER = [
    *(f"V{i}" for i in range(1, 29)),
    "Amount",
    "log_amount",
    "Time",
    "time_hours",
    "time_days",
    "day_index",
    "hour",
    "hour_sin",
    "hour_cos",
]


def build_credit_card_features(payload: Mapping[str, Any]) -> pd.DataFrame:
    """Build one ordered 37-column row from validated raw transaction values."""
    amount = float(payload["Amount"])
    time_value = float(payload["Time"])
    values: dict[str, float] = {
        **{name: float(payload[name]) for name in RAW_INPUT_FEATURES[:-2]},
        "Amount": amount,
        "log_amount": math.log1p(amount),
        "Time": time_value,
        "time_hours": time_value / 3600.0,
        "time_days": time_value / 86400.0,
        "day_index": math.floor(time_value / 86400.0),
        "hour": (time_value % 86400) / 3600.0,
    }
    values["hour_sin"] = math.sin(2 * math.pi * values["hour"] / 24.0)
    values["hour_cos"] = math.cos(2 * math.pi * values["hour"] / 24.0)
    return pd.DataFrame([[values[name] for name in FEATURE_ORDER]], columns=FEATURE_ORDER)
