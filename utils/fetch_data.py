import requests
import pandas as pd
import os
import json
from datetime import datetime
from utils.cache_manager import get_cached_trades, set_cached_trades

GAMMA_URL = "https://gamma-api.polymarket.com/markets"
TRADES_URL = "https://data-api.polymarket.com/trades"
DATA_API_BASE = "https://data-api.polymarket.com"

# Simple in-memory cache for recent trades
_trades_cache = {}

def _get_cache_file():
    """Get path to cache file."""
    cache_dir = "data/.cache"
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, "trades_cache.json")

def fetch_trades(market_slug_or_id, max_trades=10000, timeout=15):
    """
    Fetches historical trade data for a specific market slug or ID (all-time by default).
    Uses pagination to go back in time until no more data or cap is reached.
    
    Args:
        market_slug_or_id: Market slug or condition ID
        max_trades: Maximum trades to fetch (capped at 10000 for all-time)
        timeout: Request timeout in seconds
    
    Returns:
        DataFrame with trade data or empty DataFrame if none found
    """
    # Cap for all-time history (allow large fetch)
    max_trades = min(max_trades, 10000)

    # Skip cache for all-time requests so we don't return old short-window data
    use_cache = max_trades <= 2000
    if use_cache:
        cached = get_cached_trades(market_slug_or_id)
        if cached is not None:
            return cached
        if market_slug_or_id in _trades_cache:
            return _trades_cache[market_slug_or_id]

    condition_id = None

    # 1. Resolve to conditionId with timeout (reuse if already a condition ID)
    if market_slug_or_id.startswith('0x'):
        # Already a condition ID, skip resolution
        condition_id = market_slug_or_id
    else:
        # Need to resolve slug to condition ID
        try:
            response = requests.get(
                GAMMA_URL, 
                params={"slug": market_slug_or_id},
                timeout=timeout
            )
            data = response.json()
            
            if isinstance(data, list) and len(data) > 0:
                condition_id = data[0].get("conditionId")
            else:
                # Fallback to search if slug lookup fails
                response = requests.get(
                    GAMMA_URL,
                    params={"search": market_slug_or_id},
                    timeout=timeout
                )
                data = response.json()
                if data:
                    condition_id = data[0].get("conditionId")
        except requests.Timeout:
            print(f"⏱ Timeout resolving {market_slug_or_id}")
            return pd.DataFrame()
        except Exception as e:
            print(f"❌ Error resolving {market_slug_or_id}: {e}")
            return pd.DataFrame()

    if not condition_id:
        print(f"❌ Could not resolve {market_slug_or_id} to a conditionId.")
        return pd.DataFrame()

    # 2. Fetch trades with optimized batching
    all_trades = []
    params = {
        "limit": 500,  # API max
        "market": condition_id
    }
    
    max_iterations = 20  # Paginate back for all-time (20 * 500 = up to 10k trades)
    iterations = 0
    
    print(f"🔄 Fetching trades for {market_slug_or_id}...")

    while iterations < max_iterations:
        try:
            response = requests.get(TRADES_URL, params=params, timeout=timeout)
            batch = response.json()

            if not batch or not isinstance(batch, list) or len(batch) == 0:
                print(f"✓ Fetched {len(all_trades)} trades in {iterations + 1} iteration(s)")
                break
                
            all_trades.extend(batch)
            iterations += 1
            
            # Early exit if we have enough trades
            if len(all_trades) >= max_trades:
                all_trades = all_trades[:max_trades]
                print(f"✓ Reached target of {max_trades} trades")
                break
            
            # Pagination: use earliest timestamp in this batch
            earliest_ts = min(int(t.get("timestamp", 0)) for t in batch)
            
            # Avoid infinite loop on same timestamp
            if params.get("end") == earliest_ts:
                params["end"] = earliest_ts - 1
            else:
                params["end"] = earliest_ts
            
        except requests.Timeout:
            print(f"⏱ Timeout fetching trades (iteration {iterations + 1})")
            break
        except Exception as e:
            print(f"❌ Error fetching trades: {e}")
            break

    if not all_trades:
        print(f"⚠ No trades found for {market_slug_or_id}")
        return pd.DataFrame()

    # 3. Process into DataFrame
    processed = []
    for trade in all_trades:
        try:
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
        except Exception as e:
            print(f"⚠ Error processing trade: {e}")
            continue

    df = pd.DataFrame(processed)
    if df.empty:
        return df

    # Ensure sorted chronologically
    df = df.sort_values("timestamp")

    # Cache only when we used cache for this request (short-window); don't overwrite with huge payloads for all-time
    if use_cache:
        _trades_cache[market_slug_or_id] = df
        set_cached_trades(market_slug_or_id, df)

    return df


def fetch_user_activity(address):
    """Fetches on-chain activity for a user (deposits, withdrawals, fills)."""
    url = f"{DATA_API_BASE}/activity"
    response = requests.get(url, params={"user": address})
    return response.json() if response.status_code == 200 else []

def fetch_user_trades(address):
    """Fetches full trade history for a specific user address."""
    url = f"{DATA_API_BASE}/trades"
    response = requests.get(url, params={"user": address})
    if response.status_code == 200:
        trades = response.json()
        return pd.DataFrame(trades)
    return pd.DataFrame()

def fetch_user_positions(address):
    """Fetches current open positions for a specific user address."""
    url = f"{DATA_API_BASE}/positions"
    response = requests.get(url, params={"user": address})
    if response.status_code == 200:
        positions = response.json()
        return pd.DataFrame(positions)
    return pd.DataFrame()


def calculate_volume_split(trades_df, yes_label=None, no_label=None):
    """
    Calculates YES/NO volume split with robust label mapping.
    Uses market-specific labels if provided, otherwise falls back to defaults.
    """
    if trades_df.empty:
        return 0.0, 0.0
        
    df = trades_df.copy()
    df['outcome_norm'] = df['outcome'].astype(str).str.strip().str.upper()
    
    # 1. Identity the labels to look for
    yes_val = "YES"
    no_val = "NO"

    if yes_label:
        yes_val = str(yes_label).strip().upper()
    if no_label:
        no_val = str(no_label).strip().upper()
    
    # Fallback to defaults if labels are identical (shouldn't happen with good metadata)
    if yes_val == no_val:
        yes_val, no_val = "YES", "NO"

    # Define robust variants but prioritize the explicit labels if they differ
    yes_variants = {'YES', 'PURCHASE YES', 'TRUE', 'LONG', 'WON', 'WIN'}
    no_variants = {'NO', 'PURCHASE NO', 'FALSE', 'SHORT', 'LOST', 'LOSS'}
    
    # Ensure current labels are in the sets
    yes_variants.add(yes_val)
    no_variants.add(no_val)

    # Calculate dollar volume (size * price)
    df['vol_usd'] = df['size'] * df['price']
    
    # Strict matching: First try explicit labels
    yes_df = df[df['outcome_norm'] == yes_val]
    no_df = df[df['outcome_norm'] == no_val]
    
    # Fallback to variants if nothing found with explicit labels
    if yes_df.empty and no_df.empty:
        yes_df = df[df['outcome_norm'].isin(yes_variants)]
        no_df = df[df['outcome_norm'].isin(no_variants)]
    
    yes_vol = float(yes_df['vol_usd'].sum())
    no_vol = float(no_df['vol_usd'].sum())
    
    # Log the result for verification
    slug = trades_df['slug'].iloc[0] if 'slug' in trades_df.columns and not trades_df.empty else "unknown"
    print(f"📊 Volume Split [{slug}]: {yes_val}={yes_vol:.2f} | {no_val}={no_vol:.2f}")
    
    return yes_vol, no_vol


def normalize_trade_prices(trades_df, yes_label=None):
    """
    Normalizes trade prices to the YES side.
    If a trade is for 'NO', price = 1.0 - price.
    """
    if trades_df.empty:
        return trades_df
        
    df = trades_df.copy()
    df['outcome_norm'] = df['outcome'].astype(str).str.strip().str.upper()
    
    yes_variants = {'YES', 'PURCHASE YES', 'TRUE', 'LONG', 'WON', 'WIN'}
    if yes_label:
        yes_variants.add(str(yes_label).strip().upper())
        
    # If it's NOT a YES variant, assume it's a NO variant or something that needs inverting
    # For binary markets, this is robust. For multi-outcome, we might need more logic.
    mask = ~df['outcome_norm'].isin(yes_variants)
    df.loc[mask, 'price'] = 1.0 - df.loc[mask, 'price']
    
    return df
