
"""
Production feature engineering for fraud_model_v1.

This module converts a raw IEEE-CIS-style transaction into the
exact 22 features expected by the deployed fraud model.

Design principles:
- Historical features use only transactions observed before
  the current transaction.
- Current transaction is never included in its own history.
- Feature definitions mirror the training pipeline.
- Input validation is explicit.
- State updates happen only after feature computation.
- The module is deterministic for a given transaction and state.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import Any, Dict, Mapping, Optional

import numpy as np
import pandas as pd


LOGGER = logging.getLogger(__name__)


FEATURE_SCHEMA = [
    "TransactionDT",
    "TransactionAmt",
    "transaction_hour",
    "transaction_day",
    "transaction_week",
    "transaction_day_of_week",
    "hour_sin",
    "hour_cos",
    "amount_log1p",
    "time_since_previous_transaction",
    "has_previous_transaction",
    "card1_prev_count",
    "card1_prev_amount_mean",
    "card1_prev_amount_std",
    "card1_prev_amount_deviation",
    "card1_time_since_previous",
    "addr1_prev_count",
    "email_prev_count",
    "card1_addr1_prev_count",
    "card1_has_history",
    "card1_amount_history_available",
    "card1_time_history_available",
]


# These are the training-only fallback values used when
# behavioral history is unavailable.
TRAINING_IMPUTATION_VALUES = {
    "card1_prev_amount_mean": 115.011144,
    "card1_prev_amount_std": 0.0,
    "card1_prev_amount_deviation": 0.0,
    "card1_time_since_previous": 0.0,
}


SECONDS_PER_HOUR = 3600.0
SECONDS_PER_DAY = 86400.0
SECONDS_PER_WEEK = 604800.0


def _is_missing(value: Any) -> bool:
    """Return True when a value should be treated as missing."""
    if value is None:
        return True

    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def _optional_key(
    transaction: Mapping[str, Any],
    key: str,
) -> Optional[Any]:
    """Return an optional transaction field as None when missing."""
    value = transaction.get(key)

    if _is_missing(value):
        return None

    return value


def _require_numeric(
    transaction: Mapping[str, Any],
    key: str,
) -> float:
    """Validate and return a required numeric transaction field."""
    if key not in transaction:
        raise ValueError(
            f"Required transaction field '{key}' is missing."
        )

    value = transaction[key]

    if _is_missing(value):
        raise ValueError(
            f"Required transaction field '{key}' is null."
        )

    try:
        numeric_value = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"Transaction field '{key}' must be numeric."
        ) from exc

    if not math.isfinite(numeric_value):
        raise ValueError(
            f"Transaction field '{key}' must be finite."
        )

    return numeric_value


def _normalise_entity(value: Any) -> Optional[str]:
    """
    Normalize an optional entity identifier.

    Missing values remain None. Values are converted to strings
    so that dictionary keys are deterministic.
    """
    if _is_missing(value):
        return None

    return str(value)


@dataclass
class EntityHistory:
    """Historical state for one entity key."""

    count: int = 0
    amount_sum: float = 0.0
    amount_sum_sq: float = 0.0
    last_transaction_dt: Optional[float] = None

    def add(
        self,
        transaction_dt: float,
        amount: float,
    ) -> None:
        """Add one already-observed transaction to history."""
        self.count += 1
        self.amount_sum += amount
        self.amount_sum_sq += amount * amount
        self.last_transaction_dt = transaction_dt

    @property
    def mean_amount(self) -> Optional[float]:
        """Return historical mean amount."""
        if self.count == 0:
            return None

        return self.amount_sum / self.count

    @property
    def std_amount(self) -> float:

        """Return sample standard deviation of historical amounts.

    

        This matches pandas expanding().std() semantics used

        during model training: ddof=1.

        """

        if self.count < 2:

            return 0.0

    

        mean = self.amount_sum / self.count

    

        numerator = (

            self.amount_sum_sq

            - self.count * mean * mean

        )

    

        variance = numerator / (self.count - 1)

    

        # Protect against tiny floating-point negative values.

        variance = max(variance, 0.0)

    

        return float(np.sqrt(variance))

@dataclass
class FeatureState:
    """
    Historical state required for production behavioral features.

    The state contains only transactions that have already been
    observed. The current transaction must be scored before it is
    added to this state.
    """

    last_transaction_dt: Optional[float] = None

    card1: Dict[str, EntityHistory] = field(
        default_factory=dict
    )

    addr1: Dict[str, EntityHistory] = field(
        default_factory=dict
    )

    email: Dict[str, EntityHistory] = field(
        default_factory=dict
    )

    card1_addr1: Dict[str, EntityHistory] = field(
        default_factory=dict
    )


class ProductionFeatureEngineer:
    """
    Leakage-safe production feature transformer.

    A single instance owns historical state for the transaction
    stream it processes.
    """

    def __init__(
        self,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        self.logger = logger or LOGGER
        self.state = FeatureState()

    # --------------------------------------------------------
    # Temporal features
    # --------------------------------------------------------

    @staticmethod
    def _build_temporal_features(
        transaction_dt: float,
        transaction_amt: float,
        state: FeatureState,
    ):
        """
        Build temporal features using frozen training semantics.

        transaction_hour =
            floor(TransactionDT / 3600) % 24

        transaction_day =
            floor(TransactionDT / 86400)

        transaction_week =
            floor(TransactionDT / 604800)

        transaction_day_of_week =
            transaction_day % 7

        time_since_previous_transaction =
            current TransactionDT - previous global TransactionDT

        has_previous_transaction =
            0 only on the first transaction,
            1 for every subsequent transaction including duplicate DT.
        """
        transaction_dt = float(
            transaction_dt
        )

        transaction_amt = float(
            transaction_amt
        )

        if not np.isfinite(transaction_dt):
            raise ValueError(
                "TransactionDT must be finite."
            )

        if not np.isfinite(transaction_amt):
            raise ValueError(
                "TransactionAmt must be finite."
            )

        if transaction_amt < 0:
            raise ValueError(
                "TransactionAmt cannot be negative."
            )

        transaction_hour = (
            int(transaction_dt // 3600)
            % 24
        )

        transaction_day = (
            int(transaction_dt // 86400)
        )

        transaction_week = (
            int(transaction_dt // 604800)
        )

        transaction_day_of_week = (
            transaction_day % 7
        )

        hour_angle = (
            2.0 * np.pi
            * transaction_hour
            / 24.0
        )

        hour_sin = float(
            np.sin(hour_angle)
        )

        hour_cos = float(
            np.cos(hour_angle)
        )

        amount_log1p = float(
            np.log1p(transaction_amt)
        )

        if state.last_transaction_dt is None:

            time_since_previous_transaction = 0.0
            has_previous_transaction = 0

        else:

            previous_dt = float(
                state.last_transaction_dt
            )

            if transaction_dt < previous_dt:
                raise ValueError(
                    "Out-of-order TransactionDT: "
                    f"got {transaction_dt} after {previous_dt}."
                )

            time_since_previous_transaction = (
                transaction_dt - previous_dt
            )

            has_previous_transaction = 1

        return {
            "transaction_hour":
                transaction_hour,

            "transaction_day":
                transaction_day,

            "transaction_week":
                transaction_week,

            "transaction_day_of_week":
                transaction_day_of_week,

            "hour_sin":
                hour_sin,

            "hour_cos":
                hour_cos,

            "amount_log1p":
                amount_log1p,

            "time_since_previous_transaction":
                float(
                    time_since_previous_transaction
                ),

            "has_previous_transaction":
                int(
                    has_previous_transaction
                ),
        }

    @staticmethod
    def _get_history(
        history_map,
        key,
    ):
            if key is None:
                return None

            return history_map.get(key)

    @staticmethod
    def _get_last_transaction_dt(
        histories: list[Optional[EntityHistory]],
    ) -> Optional[float]:
        """
        Return the latest previous transaction time among
        available histories.
        """
        timestamps = [
            history.last_transaction_dt
            for history in histories
            if (
                history is not None
                and history.last_transaction_dt is not None
            )
        ]

        if not timestamps:
            return None

        return max(timestamps)

    # --------------------------------------------------------
    # Behavioral features
    # --------------------------------------------------------

    @staticmethod
    def _build_behavioral_features(
        transaction_amt: float,
        transaction_dt: float,
        card1_history: Optional[EntityHistory],
        addr1_history: Optional[EntityHistory],
        email_history: Optional[EntityHistory],
        card1_addr1_history: Optional[EntityHistory],
    ) -> Dict[str, float]:
        """Build leakage-safe historical behavioral features."""

        if card1_history is None:
            card1_prev_count = 0.0
            card1_prev_amount_mean = (
                TRAINING_IMPUTATION_VALUES[
                    "card1_prev_amount_mean"
                ]
            )
            card1_prev_amount_std = (
                TRAINING_IMPUTATION_VALUES[
                    "card1_prev_amount_std"
                ]
            )
            card1_prev_amount_deviation = (
                TRAINING_IMPUTATION_VALUES[
                    "card1_prev_amount_deviation"
                ]
            )
            card1_time_since_previous = (
                TRAINING_IMPUTATION_VALUES[
                    "card1_time_since_previous"
                ]
            )
            card1_has_history = 0.0
            card1_amount_history_available = 0.0
            card1_time_history_available = 0.0

        else:
            card1_prev_count = float(
                card1_history.count
            )

            mean_amount = (
                card1_history.mean_amount
            )

            std_amount = (
                card1_history.std_amount
            )

            card1_prev_amount_mean = (
                mean_amount
                if mean_amount is not None
                else TRAINING_IMPUTATION_VALUES[
                    "card1_prev_amount_mean"
                ]
            )

            card1_prev_amount_std = (
                std_amount
                if std_amount is not None
                else TRAINING_IMPUTATION_VALUES[
                    "card1_prev_amount_std"
                ]
            )

            card1_prev_amount_deviation = (
                transaction_amt
                - card1_prev_amount_mean
            )

            if (
                card1_history.last_transaction_dt
                is None
            ):
                card1_time_since_previous = (
                    TRAINING_IMPUTATION_VALUES[
                        "card1_time_since_previous"
                    ]
                )
                card1_time_history_available = 0.0
            else:
                card1_time_since_previous = (
                    transaction_dt
                    - card1_history.last_transaction_dt
                )
                card1_time_history_available = 1.0

            card1_has_history = 1.0
            card1_amount_history_available = 1.0

        return {
            "card1_prev_count": float(
                card1_prev_count
            ),
            "card1_prev_amount_mean": float(
                card1_prev_amount_mean
            ),
            "card1_prev_amount_std": float(
                card1_prev_amount_std
            ),
            "card1_prev_amount_deviation": float(
                card1_prev_amount_deviation
            ),
            "card1_time_since_previous": float(
                card1_time_since_previous
            ),
            "addr1_prev_count": float(
                addr1_history.count
                if addr1_history is not None
                else 0
            ),
            "email_prev_count": float(
                email_history.count
                if email_history is not None
                else 0
            ),
            "card1_addr1_prev_count": float(
                card1_addr1_history.count
                if card1_addr1_history is not None
                else 0
            ),
            "card1_has_history": float(
                card1_has_history
            ),
            "card1_amount_history_available": float(
                card1_amount_history_available
            ),
            "card1_time_history_available": float(
                card1_time_history_available
            ),
        }

    # --------------------------------------------------------
    # Public transformation API
    # --------------------------------------------------------

    def transform(
        self,
        transaction: Mapping[str, Any],
        update_state: bool = True,
    ):
        """
        Transform one raw transaction into the exact 22 model features.
        
        The current transaction is excluded from behavioral history.
        Temporal history uses self.state.last_transaction_dt.
        """
        transaction_dt = _require_numeric(
            transaction,
            "TransactionDT",
        )

        transaction_amt = _require_numeric(
            transaction,
            "TransactionAmt",
        )

        if not np.isfinite(transaction_dt):
            raise ValueError(
                "TransactionDT must be finite."
            )

        if not np.isfinite(transaction_amt):
            raise ValueError(
                "TransactionAmt must be finite."
            )

        if transaction_amt < 0:
            raise ValueError(
                "TransactionAmt cannot be negative."
            )

        card1 = _normalise_entity(
            _optional_key(
                transaction,
                "card1",
            )
        )

        addr1 = _normalise_entity(
            _optional_key(
                transaction,
                "addr1",
            )
        )

        email = _normalise_entity(
            _optional_key(
                transaction,
                "P_emaildomain",
            )
        )

        CARD1_ADDR1_MISSING_ADDR1 = (
            "__MISSING_ADDR1__"
        )

        card1_addr1 = None

        if card1 is not None:

            normalized_addr1 = (
                addr1
                if addr1 is not None
                else CARD1_ADDR1_MISSING_ADDR1
            )

            card1_addr1 = (
                f"{card1}::{normalized_addr1}"
            )

        card1_history = self._get_history(
            self.state.card1,
            card1,
        )

        addr1_history = self._get_history(
            self.state.addr1,
            addr1,
        )

        email_history = self._get_history(
            self.state.email,
            email,
        )

        card1_addr1_history = self._get_history(
            self.state.card1_addr1,
            card1_addr1,
        )

        temporal_features = (
            self._build_temporal_features(
                transaction_dt=transaction_dt,
                transaction_amt=transaction_amt,
                state=self.state,
            )
        )

        behavioral_features = (
            self._build_behavioral_features(
                transaction_amt=transaction_amt,
                transaction_dt=transaction_dt,
                card1_history=card1_history,
                addr1_history=addr1_history,
                email_history=email_history,
                card1_addr1_history=card1_addr1_history,
            )
        )

        features: Dict[str, float] = {
            "TransactionDT": transaction_dt,
            "TransactionAmt": transaction_amt,
            **temporal_features,
            **behavioral_features,
        }

        if list(features.keys()) != FEATURE_SCHEMA:
            raise RuntimeError(
                "Production feature order does not match "
                "the frozen model schema."
            )

        values = np.asarray(
            list(features.values()),
            dtype=float,
        )

        if not np.isfinite(values).all():
            raise RuntimeError(
                "Feature engineering produced NaN or "
                "infinite values."
            )

        if update_state:

            self._update_state(
                transaction_dt=transaction_dt,
                transaction_amt=transaction_amt,
                card1=card1,
                addr1=addr1,
                email=email,
                card1_addr1=card1_addr1,
            )

            # Commit global chronological state ONLY after the
            # complete feature transformation succeeds.
            self.state.last_transaction_dt = (
                transaction_dt
            )

        self.logger.debug(
            "Generated production features for "
            "TransactionDT=%s",
            transaction_dt,
        )

        return features

    # --------------------------------------------------------
    # State update
    # --------------------------------------------------------

    def _update_state(
        self,
        transaction_dt: float,
        transaction_amt: float,
        card1: Optional[str],
        addr1: Optional[str],
        email: Optional[str],
        card1_addr1: Optional[str],
    ) -> None:
        """Add the current transaction to historical state."""

        if card1 is not None:
            history = self.state.card1.setdefault(
                card1,
                EntityHistory(),
            )
            history.add(
                transaction_dt,
                transaction_amt,
            )

        if addr1 is not None:
            history = self.state.addr1.setdefault(
                addr1,
                EntityHistory(),
            )
            history.add(
                transaction_dt,
                transaction_amt,
            )

        if email is not None:
            history = self.state.email.setdefault(
                email,
                EntityHistory(),
            )
            history.add(
                transaction_dt,
                transaction_amt,
            )

        if card1_addr1 is not None:
            history = self.state.card1_addr1.setdefault(
                card1_addr1,
                EntityHistory(),
            )
            history.add(
                transaction_dt,
                transaction_amt,
            )


__all__ = [
    "FEATURE_SCHEMA",
    "TRAINING_IMPUTATION_VALUES",
    "EntityHistory",
    "FeatureState",
    "ProductionFeatureEngineer",
]
