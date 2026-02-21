import pandas as pd


def whale_dominance_score(wallet_summary):
    """
    If top wallets dominate volume, move may be whale-driven.
    Returns 0-1.
    """

    if wallet_summary.empty:
        return 0

    total_volume = wallet_summary["total_volume"].sum()

    if total_volume == 0:
        return 0

    top_volume = (
        wallet_summary
        .sort_values("total_volume", ascending=False)
        .head(3)["total_volume"]
        .sum()
    )

    dominance_ratio = top_volume / total_volume

    score = min(dominance_ratio * 2, 1)

    return score
