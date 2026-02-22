import pandas as pd
import numpy as np

def build_features(trades_df):
    trades_df = trades_df.sort_values("timestamp")

    # Resample to 30-minute buckets
    trades_df.set_index("timestamp", inplace=True)

    grouped = trades_df.groupby(pd.Grouper(freq="30min"))

    features = []

    for ts, group in grouped:
        if len(group) < 5:
            continue

        whale_threshold = group["size"].quantile(0.95)

        whale_activity = group[group["size"] >= whale_threshold]["size"].sum()
        total_volume = group["size"].sum()
        order_imbalance = (
            group[group["side"] == "YES"]["size"].sum()
            - group[group["side"] == "NO"]["size"].sum()
        )

        volatility = group["price"].std()

        features.append({
            "timestamp": ts,
            "whale_activity": whale_activity,
            "total_volume": total_volume,
            "order_imbalance": order_imbalance,
            "volatility": volatility,
            "last_price": group["price"].iloc[-1]
        })

    features_df = pd.DataFrame(features).dropna()

    # Target = next 30-min return
    features_df["next_return"] = (
        features_df["last_price"].shift(-1) - features_df["last_price"]
    )

    return features_df.dropna()