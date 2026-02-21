import requests
import pandas as pd

MARKETS_URL = "https://gamma-api.polymarket.com/markets"

def fetch_markets(limit=10):
    params = {
        "active": True,
        "closed": False,
        "limit": limit
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

def fetch_active_event_map(limit=200):
    """
    Fetches active markets and groups slugs by their parent event title.
    Returns: { 'Event Title': [ 'slug1', 'slug2', ... ] }
    """
    df = fetch_markets(limit=limit)
    if df.empty:
        return {}
    
    # Group by event_title and collect slugs
    event_map = df.groupby("event_title")["slug"].apply(list).to_dict()
    return event_map