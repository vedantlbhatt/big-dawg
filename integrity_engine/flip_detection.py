# integrity_engine/flip_detection.py

def flip_frequency_score(trades):
    """
    Measures how often wallets flip BUY/SELL.
    Returns risk score 0-1.
    """

    if trades.empty:
        return 0

    flip_counts = []

    for wallet, group in trades.groupby("wallet"):
        group = group.sort_values("timestamp")
        flips = (group["side"] != group["side"].shift()).sum()
        flip_counts.append(flips)

    avg_flips = sum(flip_counts) / len(flip_counts)

    risk = min(avg_flips / 10, 1)

    return risk