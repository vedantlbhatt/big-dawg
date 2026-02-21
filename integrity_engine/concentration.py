# integrity_engine/concentration.py

import numpy as np

def whale_concentration_score(wallet_summary, top_n=5):
    """
    Returns risk score between 0 and 1.
    Higher = more whale dominated (worse).
    """

    if wallet_summary.empty:
        return 0

    total_volume = wallet_summary["total_volume"].sum()

    top_volume = (
        wallet_summary
        .sort_values("total_volume", ascending=False)
        .head(top_n)["total_volume"]
        .sum()
    )

    concentration_ratio = top_volume / total_volume

    # Normalize risk
    # <30% safe, >60% dangerous
    risk = min(max((concentration_ratio - 0.3) / 0.3, 0), 1)

    return risk