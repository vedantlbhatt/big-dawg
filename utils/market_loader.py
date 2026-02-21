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
    seen_event_ids = set()

    for m in data:
        # Get the event ID to ensure diversity
        events = m.get("events", [])
        event_id = events[0].get("id") if events else None
        
        if event_id and event_id in seen_event_ids:
            continue
            
        if event_id:
            seen_event_ids.add(event_id)

        markets.append({
            "question": m.get("question"),
            "slug": m.get("slug"),
            "volume": float(m.get("volume", 0)),
            "conditionId": m.get("conditionId")
        })

    df = pd.DataFrame(markets)
    df = df.sort_values("volume", ascending=False)

    return df.head(limit)