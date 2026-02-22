import requests
import pandas as pd
import time
from utils.cache_manager import get_cached_markets, set_cached_markets

MARKETS_URL = "https://gamma-api.polymarket.com/markets"

def fetch_markets(limit=200, query=None):
    """
    OPTIMIZED: Fetch active Polymarket markets with caching.
    
    Args:
        limit: Number of markets to return
        query: Optional search query (not used for API, filtered server-side)
    
    Returns:
        DataFrame with markets sorted by volume
    """
    # If no search query, try to use cached market list
    if not query:
        cached_df = get_cached_markets()
        if cached_df is not None:
            print(f"📦 Using cached market list ({len(cached_df)} markets)")
            return cached_df[:limit]
    
    print(f"🔄 Fetching {limit} markets from Polymarket...")
    start_time = time.time()
    
    all_markets = []
    offset = 0
    batch_size = 500  # Max per request
    max_offset = 5000  # Don't fetch too far (API limit)

    while len(all_markets) < limit and offset < max_offset:
        try:
            params = {
                "active": True,
                "closed": False,
                "limit": min(batch_size, limit - len(all_markets)),
                "offset": offset
            }

            response = requests.get(MARKETS_URL, params=params, timeout=10)
            data = response.json()

            if not data:
                print(f"✓ Reached end of markets at offset {offset}")
                break

            for m in data:
                events = m.get("events", [])
                event_title = events[0].get("title") if events else m.get("question")
                
                try:
                    outcomes_raw = m.get("outcomes")
                    if outcomes_raw and isinstance(outcomes_raw, str):
                        import json
                        outcomes = json.loads(outcomes_raw)
                        yes_label = outcomes[0] if outcomes else "YES"
                    else:
                        yes_label = "YES"
                except Exception:
                    yes_label = "YES"
                
                try:
                    prices_raw = m.get("outcomePrices")
                    if prices_raw and isinstance(prices_raw, str):
                        import json
                        prices = json.loads(prices_raw)
                        current_price = float(prices[0]) if prices else 0.5
                    else:
                        current_price = 0.5
                except Exception:
                    current_price = 0.5
                
                all_markets.append({
                    "event_title": event_title,
                    "question": m.get("question"),
                    "slug": m.get("slug"),
                    "volume": float(m.get("volume", 0)),
                    "conditionId": m.get("conditionId"),
                    "yes_label": yes_label,
                    "current_price": current_price
                })

            offset += len(data)
            
            if len(data) < batch_size:
                print(f"✓ Fetched {len(all_markets)} markets in {time.time() - start_time:.2f}s")
                break
                
        except requests.Timeout:
            print(f"⏱ Timeout fetching markets at offset {offset}")
            break
        except Exception as e:
            print(f"❌ Error fetching markets: {e}")
            break

    df = pd.DataFrame(all_markets[:limit])
    if df.empty:
        return df
    
    # Sort by volume descending (highest liquidity first)
    df = df.sort_values("volume", ascending=False)
    
    # Cache for subsequent requests (only if we got a good amount of data)
    if len(df) > 50:
        set_cached_markets(df)
        print(f"✓ Cached {len(df)} markets for future requests")
    
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