import requests
import pandas as pd

GAMMA_URL = "https://gamma-api.polymarket.com/markets"
TRADES_URL = "https://data-api.polymarket.com/trades"

def fetch_trades(market_slug_or_id):
    """
    Fetches historical trade data for a specific market slug or ID.
    """
    condition_id = None

    # 1. Resolve to conditionId
    if isinstance(market_slug_or_id, str) and market_slug_or_id.startswith("0x"):
        condition_id = market_slug_or_id
    else:
        # Try direct slug match first
        response = requests.get(GAMMA_URL, params={"slug": market_slug_or_id})
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            condition_id = data[0].get("conditionId")
        else:
            # Fallback to search if slug lookup fails
            response = requests.get(GAMMA_URL, params={"search": market_slug_or_id})
            data = response.json()
            if data:
                condition_id = data[0].get("conditionId")

    if not condition_id:
        print(f"Could not resolve {market_slug_or_id} to a conditionId.")
        return pd.DataFrame()

    # 2. Iterative Fetching (Historical Pagination)
    all_trades = []
    params = {
        "limit": 500,  # Data API max is 500
        "market": condition_id
    }

    # Fetching loop - Polymarket Data API usually returns trades in reverse chronological order
    # We use timestamps to walk backwards
    while True:
        response = requests.get(TRADES_URL, params=params)
        batch = response.json()

        if not batch or not isinstance(batch, list) or len(batch) == 0:
            break
            
        all_trades.extend(batch)
        print(f"Fetched {len(all_trades)} trades so far...")
        
        # To get the next batch, we set the 'end' timestamp to the earliest trade in this batch
        earliest_ts = min(int(t.get("timestamp", 0)) for t in batch)
        
        # If we have reached the end of history or no progress is made
        if params.get("end") == earliest_ts:
            # If we are stuck on the same timestamp, decrement to move forward (backwards in time)
            params["end"] = earliest_ts - 1
        else:
            params["end"] = earliest_ts
        
        # Stop at a reasonable limit for this specific demo/app (e.g. 10000 trades)
        if len(all_trades) >= 10000:
            break

    if not all_trades:
        return pd.DataFrame()

    # 3. Process into DataFrame
    processed = []
    for trade in all_trades:
        processed.append({
            "wallet": trade.get("proxyWallet"),
            "timestamp": pd.to_datetime(trade.get("timestamp"), unit="s"),
            "size": float(trade.get("size", 0)),
            "price": float(trade.get("price", 0)),
            "side": trade.get("side"),
            "outcome": trade.get("outcome"),
            "slug": trade.get("slug"),
            "tx_id": trade.get("transactionHash")
        })

    df = pd.DataFrame(processed)
    # Ensure it's sorted chronologically for the app
    df = df.sort_values("timestamp")
    return df

