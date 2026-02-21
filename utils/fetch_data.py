import requests
import pandas as pd

BASE_URL = "https://data-api.polymarket.com/activity"

def fetch_trades(market_slug):
    params = {
        "marketSlug": market_slug,
        "type": "TRADE",
        "limit": 5000
    }

    response = requests.get(BASE_URL, params=params)
    data = response.json()

    trades = []
    for trade in data:
        trades.append({
            "wallet": trade.get("proxyWallet"),
            "timestamp": pd.to_datetime(trade.get("timestamp"), unit="s"),
            "size": float(trade.get("size", 0)),
            "price": float(trade.get("price", 0)),
            "side": trade.get("side")
        })

    df = pd.DataFrame(trades).sort_values("timestamp")
    return df