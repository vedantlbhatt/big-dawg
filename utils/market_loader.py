import requests
import pandas as pd

MARKETS_URL = "https://gamma-api.polymarket.com/markets"

def fetch_markets(limit=50):
    params = {
        "active": True,
        "closed": False,
        "limit": limit
    }

    response = requests.get(MARKETS_URL, params=params)
    data = response.json()

    markets = []

    for m in data:
        markets.append({
            "question": m.get("question"),
            "slug": m.get("slug"),
            "volume": m.get("volume")
        })

    df = pd.DataFrame(markets)
    df = df.sort_values("volume", ascending=False)

    return df