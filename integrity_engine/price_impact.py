# integrity_engine/price_impact.py

import numpy as np

def price_impact_score(trades):
    """
    Measures how much price moves per trade.
    Returns risk score 0-1.
    """

    if len(trades) < 2:
        return 0

    trades = trades.sort_values("timestamp")

    trades["price_change"] = trades["price"].diff().abs()
    trades["impact"] = trades["price_change"] / trades["size"].replace(0, np.nan)

    avg_impact = trades["impact"].mean()

    # Heuristic normalization
    risk = min(avg_impact * 100, 1)

    return risk