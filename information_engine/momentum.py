import numpy as np


def momentum_score(price_series):
    """
    Detect trending behavior.
    Returns 0-1 (higher = momentum-driven).
    """

    if len(price_series) < 5:
        return 0

    price_series_copy = price_series.copy()
    price_series_copy["return"] = price_series_copy["price"].diff()

    trend_strength = abs(price_series_copy["return"].mean())

    score = min(trend_strength * 50, 1)

    return score
