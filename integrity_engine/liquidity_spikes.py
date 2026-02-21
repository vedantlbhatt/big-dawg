# integrity_engine/liquidity_spikes.py

import pandas as pd

def liquidity_spike_score(trades, window="10min"):
    """
    Detect abnormal volume spikes.
    Returns risk score 0-1.
    """

    if trades.empty:
        return 0

    trades["timestamp"] = pd.to_datetime(trades["timestamp"])

    volume_series = (
        trades
        .set_index("timestamp")
        .resample(window)["size"]
        .sum()
    )

    rolling_mean = volume_series.rolling(3).mean()

    spike_ratio = (volume_series / rolling_mean).max()

    if pd.isna(spike_ratio):
        return 0

    risk = min(max((spike_ratio - 2) / 3, 0), 1)

    return risk