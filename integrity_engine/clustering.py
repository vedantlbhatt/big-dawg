# integrity_engine/clustering.py

import pandas as pd

def timing_cluster_score(trades, window="1min"):
    """
    Detect many wallets trading in same short window.
    Returns risk score 0-1.
    """

    if trades.empty:
        return 0

    trades["timestamp"] = pd.to_datetime(trades["timestamp"])

    grouped = (
        trades
        .set_index("timestamp")
        .resample(window)["wallet"]
        .nunique()
    )

    max_wallets = grouped.max()

    risk = min(max_wallets / 50, 1)

    return risk