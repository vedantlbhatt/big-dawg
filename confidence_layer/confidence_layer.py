"""
Confidence layer: turn "62%" into "62% + how reliable that number is."

Overall logic:
  - We get: trades (wallet, timestamp, price, size) and price time series.
  - DISAGREEMENT = how spread out trader beliefs are.
    Per-wallet average price = that wallet's "belief". Std of those = disagreement.
  - CONFIDENCE = how stable the market price is.
    Low volatility => high confidence; high volatility => low confidence.
  - CONVICTION (optional) = size × hold time per wallet, normalized by volatility.
    Separates "big, patient positions" from "noise / churn."
"""
from typing import Optional
import numpy as np
import pandas as pd

# Toggle: 1 = include conviction in output, 0 = skip conviction
USE_CONVICTION = 1


def _belief_dispersion(trades: pd.DataFrame) -> float:
    """Std of per-wallet average entry price (same market only)."""
    if trades.empty or "wallet" not in trades.columns:
        return float(trades["price"].std()) if "price" in trades.columns else 0.0
    beliefs = trades.groupby("wallet")["price"].mean()
    return float(beliefs.std()) if len(beliefs) > 1 else 0.0


def _volatility_confidence(price_series: pd.DataFrame) -> float:
    """Confidence from price stability: 1 / (1 + vol)."""
    # Handle Series or DataFrame
    if isinstance(price_series, pd.Series):
        prices = price_series
    elif isinstance(price_series, pd.DataFrame) and "price" in price_series.columns:
        prices = price_series["price"]
    else:
        return 0.5

    if prices.empty or len(prices) < 2:
        return 0.5
    returns = prices.pct_change().dropna()
    if len(returns) < 2:
        return 0.5
    vol = returns.std()
    if pd.isna(vol) or vol <= 0:
        return 1.0
    return float(1 / (1 + vol))


def _conviction_score(trades: pd.DataFrame, price_series: pd.DataFrame) -> float:
    """
    Per wallet: position_size * holding_duration; aggregate then normalize by market vol.
    """
    if trades.empty or len(trades) < 2 or "timestamp" not in trades.columns:
        return 0.0
    trades = trades.copy()
    trades["timestamp"] = pd.to_datetime(trades["timestamp"])
    t_min = trades["timestamp"].min()
    t_max = trades["timestamp"].max()
    span_seconds = (t_max - t_min).total_seconds() or 1.0

    def wallet_conviction(g):
        size = g["size"].abs().sum()
        hold = (g["timestamp"].max() - g["timestamp"].min()).total_seconds()
        return size * hold

    raw = trades.groupby("wallet").apply(wallet_conviction)
    agg = float(raw.sum()) if isinstance(raw, pd.Series) else 0.0

    # Handle Series or DataFrame
    if isinstance(price_series, pd.Series):
        prices = price_series
    elif isinstance(price_series, pd.DataFrame) and "price" in price_series.columns:
        prices = price_series["price"]
    else:
        prices = pd.Series()

    returns = prices.pct_change().dropna()
    vol = returns.std()
    if pd.isna(vol) or vol <= 0:
        vol = 1e-6
    normalized = agg / (span_seconds * vol + 1e-6)
    return float(np.clip(normalized, 0, 1))


def confidence_metrics(
    trades_df: pd.DataFrame,
    price_series: pd.DataFrame,
    use_conviction: Optional[int] = None,
    integrity_score: Optional[float] = None,
) -> dict:
    """
    Returns probability, disagreement level, confidence score, and optionally conviction.
    use_conviction: 1 = include conviction, 0 = omit. Default = USE_CONVICTION.
    """
    if use_conviction is None:
        use_conviction = USE_CONVICTION

    # Handle Series or DataFrame
    if isinstance(price_series, pd.Series):
        prices = price_series
    elif isinstance(price_series, pd.DataFrame) and "price" in price_series.columns:
        prices = price_series["price"]
    else:
        prices = pd.Series()

    current_prob = float(prices.iloc[-1]) if not prices.empty else 0.0
    disagreement_std = _belief_dispersion(trades_df)
    confidence = _volatility_confidence(price_series)

    # Adjust confidence based on integrity score if provided
    if integrity_score is not None:
        confidence = confidence * integrity_score

    if disagreement_std < 0.05:
        disagreement_label = "Low"
    elif disagreement_std < 0.15:
        disagreement_label = "Medium"
    else:
        disagreement_label = "High"

    if confidence < 0.4:
        confidence_level = "Low"
    elif confidence < 0.7:
        confidence_level = "Medium"
    else:
        confidence_level = "High"

    out = {
        "probability": round(current_prob, 4),
        "disagreement_std": round(disagreement_std, 4),
        "disagreement": disagreement_label,
        "confidence_score": round(confidence, 4),
        "data_quality": round(confidence, 4),
        "confidence_level": confidence_level,
    }
    if use_conviction:
        out["conviction_score"] = round(_conviction_score(trades_df, price_series), 4)
    return out
