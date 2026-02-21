import numpy as np
import pandas as pd


def reaction_latency_score(trades):
    """
    Measures how tightly trades cluster in time.
    Higher clustering = reactive behavior (retail).
    """

    if len(trades) < 5:
        return 0

    trades_copy = trades.sort_values("timestamp")

    time_diffs = trades_copy["timestamp"].diff().dt.total_seconds()

    avg_gap = time_diffs.mean()

    if pd.isna(avg_gap) or avg_gap == 0:
        return 1

    score = min(1 / (avg_gap + 1), 1)

    return score
