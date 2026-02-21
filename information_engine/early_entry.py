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
    price_series = price_series.sort_index()

    # Convert to DataFrame for easier manipulation
    price_df = price_series.to_frame("price")
    price_df["future_price"] = price_df["price"].shift(-5)
    price_df["future_return"] = (
        price_df["future_price"] - price_df["price"]
    ).abs()

    avg_future_move = price_df["future_return"].mean()

    # Normalize
    score = min(avg_future_move * 5, 1)

    return score
