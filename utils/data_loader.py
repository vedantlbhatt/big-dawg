import pandas as pd
import numpy as np
import os
import sqlite3

def get_wallet_analysis(trades_df):
    """
    Analyzes trades to produce a summary of wallet activity, profit estimates, and ROI.
    """
    if trades_df.empty:
        return pd.DataFrame()

    summary = []
    # Latest price for profit estimation
    latest_price = trades_df['price'].iloc[-1]
    
    for wallet, group in trades_df.groupby("wallet"):
        # Polymarket side is BUY/SELL
        # We treat BUY as + and SELL as -
        group['pos_multiplier'] = group['side'].map({'BUY': 1, 'SELL': -1}).fillna(0)
        net_position = (group['size'] * group['pos_multiplier']).sum()
        
        total_volume = group['size'].sum()
        total_trades = len(group)
        
        # Avg Entry: Sum(price * size) / Sum(size) for BUYS only
        buys = group[group['side'] == 'BUY']
        avg_entry_price = (buys['price'] * buys['size']).sum() / buys['size'].sum() if not buys.empty else 0
        
        # Profit Estimate: (Latest Price - Avg Entry) * Net Position
        profit_estimate = (latest_price - avg_entry_price) * net_position if net_position != 0 else 0
        
        # Cost Basis: abs(net_position) * avg_entry_price
        cost_basis = abs(net_position) * avg_entry_price
        
        # ROI
        roi = profit_estimate / cost_basis if cost_basis > 0 else 0
        
        summary.append({
            "wallet": wallet,
            "total_volume": total_volume,
            "total_trades": total_trades,
            "first_trade_ts": group['timestamp'].min(),
            "last_trade_ts": group['timestamp'].max(),
            "net_position": net_position,
            "avg_entry_price": avg_entry_price,
            "profit_estimate": profit_estimate,
            "cost_basis": cost_basis,
            "roi": roi
        })
        
    return pd.DataFrame(summary)

def save_data(trades_df):
    """
    Orchestrates the processing and saving of Polymarket trade data 
    into structured parquet files.
    """
    if not os.path.exists("data"):
        os.makedirs("data")
        
    # 1. Generate trades.parquet
    trades_path = "data/trades.parquet"
    trades_out = trades_df[[
        "wallet", "timestamp", "size", "price", "side", "tx_id", "outcome"
    ]].copy()
    trades_out.to_parquet(trades_path, index=False)
    
    # 2. Generate price_series.parquet (5-minute buckets)
    prices_path = "data/price_series.parquet"
    if not trades_df.empty:
        df_p = trades_df.set_index("timestamp")
        price_series = df_p["price"].resample("5min").agg(['first', 'last', 'max', 'min']).dropna()
        volume_series = df_p["size"].resample("5min").sum()
        
        ohlcv = pd.concat([price_series, volume_series], axis=1)
        ohlcv.columns = ["open", "price", "high", "low", "volume"]
        ohlcv.index.name = "timestamp"
        ohlcv.reset_index().to_parquet(prices_path, index=False)
    
    # 3. Generate wallet_summary.parquet
    wallet_df = get_wallet_analysis(trades_df)
    if not wallet_df.empty:
        wallet_df.to_parquet("data/wallet_summary.parquet", index=False)

def init_scout_db():
    """Initializes the SQLite database for Market Scout with schema validation."""
    db_path = "data/scout.sqlite"
    
    # Schema validation: If event_title is missing, reset the DB
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        try:
            pd.read_sql_query("SELECT event_title, wallet_score FROM market_scores LIMIT 1", conn)
            conn.close()
        except Exception:
            conn.close()
            print(f"Schema mismatch in {db_path}. Resetting database.")
            os.remove(db_path)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_scores (
            slug TEXT PRIMARY KEY,
            event_title TEXT,
            opportunity_score REAL,
            integrity_status TEXT,
            classification TEXT,
            yes_val REAL DEFAULT 0,
            no_val REAL DEFAULT 0,
            wallet_score REAL DEFAULT 0,
            integrity_score REAL DEFAULT 0,
            info_score REAL DEFAULT 0,
            conf_score REAL DEFAULT 0,
            last_scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_scout_result(slug, score, integrity, classification, event_title=None, yes_val=0, no_val=0, wallet_score=0, integrity_score=0, info_score=0, conf_score=0):
    conn = sqlite3.connect("data/scout.sqlite")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO market_scores (slug, event_title, opportunity_score, integrity_status, classification, yes_val, no_val, wallet_score, integrity_score, info_score, conf_score, last_scanned_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (slug, event_title, score, integrity, classification, yes_val, no_val, wallet_score, integrity_score, info_score, conf_score))
    conn.commit()
    conn.close()

def get_event_sentiment(event_title):
    if not os.path.exists("data/scout.sqlite"):
        return pd.DataFrame()
    conn = sqlite3.connect("data/scout.sqlite")
    df = pd.read_sql_query("SELECT slug, yes_val, no_val FROM market_scores WHERE event_title = ?", conn, params=(event_title,))
    conn.close()
    return df

def get_unique_events():
    if not os.path.exists("data/scout.sqlite"):
        return []
    conn = sqlite3.connect("data/scout.sqlite")
    df = pd.read_sql_query("SELECT DISTINCT event_title FROM market_scores", conn)
    conn.close()
    return df["event_title"].tolist() if not df.empty else []

def get_event_slugs(event_title):
    if not os.path.exists("data/scout.sqlite"):
        return []
    conn = sqlite3.connect("data/scout.sqlite")
    df = pd.read_sql_query("SELECT slug FROM market_scores WHERE event_title = ?", conn, params=(event_title,))
    conn.close()
    return df["slug"].tolist() if not df.empty else []

def get_top_scouted_markets(limit=5):
    if not os.path.exists("data/scout.sqlite"):
        return pd.DataFrame()
    conn = sqlite3.connect("data/scout.sqlite")
    df = pd.read_sql_query("SELECT * FROM market_scores ORDER BY opportunity_score DESC LIMIT ?", conn, params=(limit,))
    conn.close()
    return df

def load_trades():
    path = "data/trades.parquet"
    if not os.path.exists(path):
        return pd.DataFrame()
    try:
        return pd.read_parquet(path)
    except Exception as e:
        print(f"Error reading {path}: {e}. File may be corrupted. Deleting.")
        os.remove(path)
        return pd.DataFrame()

def load_prices():
    path = "data/price_series.parquet"
    if not os.path.exists(path):
        return pd.DataFrame()
    try:
        return pd.read_parquet(path)
    except Exception as e:
        print(f"Error reading {path}: {e}. File may be corrupted. Deleting.")
        os.remove(path)
        return pd.DataFrame()

def load_wallets():
    path = "data/wallet_summary.parquet"
    if not os.path.exists(path):
        return pd.DataFrame()
    try:
        return pd.read_parquet(path)
    except Exception as e:
        print(f"Error reading {path}: {e}. File may be corrupted. Deleting.")
        os.remove(path)
        return pd.DataFrame()