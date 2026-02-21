import requests
import pandas as pd

MARKETS_URL = "https://gamma-api.polymarket.com/markets"

def fetch_markets(limit=10):
    params = {
        "active": True,
        "closed": False,
        "limit": 100  # Fetch a larger pool for diversification
    }

    response = requests.get(MARKETS_URL, params=params)
    data = response.json()

    markets = []

    for m in data:
        # Get the event title for grouping
        events = m.get("events", [])
        event_title = events[0].get("title") if events else m.get("question")
        
        markets.append({
            "event_title": event_title,
            "question": m.get("question"),
            "slug": m.get("slug"),
            "volume": float(m.get("volume", 0)),
            "conditionId": m.get("conditionId")
        })

    df = pd.DataFrame(markets)
    df = df.sort_values("volume", ascending=False)

    return df