import requests
import pandas as pd

MARKETS_URL = "https://gamma-api.polymarket.com/markets"

def fetch_markets(limit=10, query=None):
    all_markets = []
    offset = 0
    batch_size = 500  # Max per request

    while len(all_markets) < limit:
        params = {
            "active": True,
            "closed": False,
            "limit": min(batch_size, limit - len(all_markets)),
            "offset": offset
        }

        response = requests.get(MARKETS_URL, params=params)
        data = response.json()

        if not data:
            break

        for m in data:
            events = m.get("events", [])
            event_title = events[0].get("title") if events else m.get("question")
            
            all_markets.append({
                "event_title": event_title,
                "question": m.get("question"),
                "slug": m.get("slug"),
                "volume": float(m.get("volume", 0)),
                "conditionId": m.get("conditionId")
            })

        offset += len(data)
        if len(data) < batch_size:
            break

    df = pd.DataFrame(all_markets[:limit])
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