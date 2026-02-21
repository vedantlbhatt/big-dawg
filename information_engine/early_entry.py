import numpy as np
import pandas as pd


def early_entry_score(trades, price_series):
    """
    Measures whether trades tend to occur before price jumps.
    Returns score 0-1 (higher = more informed activity).
    """

    if len(trades) < 10:
        return 0

    trades = trades.sort_values("timestamp")
    price_series = price_series.sort_values("timestamp")

    price_series["future_price"] = price_series["price"].shift(-5)
    price_series["future_return"] = (
        price_series["future_price"] - price_series["price"]
    ).abs()

    avg_future_move = price_series["future_return"].mean()

    # Normalize
    score = min(avg_future_move * 5, 1)

    return score
