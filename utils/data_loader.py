import pandas as pd
import numpy as np
import os
import sqlite3

def save_data(trades_df):
    """
    Orchestrates the processing and saving of Polymarket trade data 
    into three structured CSV files.
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
    # We use size as volume
    prices_path = "data/price_series.parquet"
    if not trades_df.empty:
        df_p = trades_df.set_index("timestamp")
        price_series = df_p["price"].resample("5min").agg(['first', 'last', 'max', 'min']).dropna()
        volume_series = df_p["size"].resample("5min").sum()
        
        ohlcv = pd.concat([price_series, volume_series], axis=1)
        ohlcv.columns = ["open", "price", "high", "low", "volume"]
        ohlcv.index.name = "timestamp"
        ohlcv.reset_index().to_parquet(prices_path, index=False)
    
    # 3. Generate wallet_summary.csv
    wallets_path = "data/wallet_summary.csv"
    if not trades_df.empty:
        summary = []
        for wallet, group in trades_df.groupby("wallet"):
            # Simple net position: BUY adds, SELL subtracts
            # Note: This assumes we are looking at one outcome at a time or 
            # aggregating for the "YES" side. For complex logic, we'd filter.
            
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
            latest_price = trades_df['price'].iloc[-1]
            profit_estimate = (latest_price - avg_entry_price) * net_position if net_position != 0 else 0
            
            summary.append({
                "wallet": wallet,
                "total_volume": total_volume,
                "total_trades": total_trades,
                "first_trade_ts": group['timestamp'].min(),
                "last_trade_ts": group['timestamp'].max(),
                "net_position": net_position,
                "avg_entry_price": avg_entry_price,
                "profit_estimate": profit_estimate
            })
            
        wallet_df = pd.DataFrame(summary)
        wallet_df.to_parquet("data/wallet_summary.parquet", index=False)

def init_scout_db():
    """Initializes the SQLite database for Market Scout."""
    db_path = "data/scout.sqlite"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_scores (
            slug TEXT PRIMARY KEY,
            opportunity_score REAL,
            integrity_status TEXT,
            classification TEXT,
            last_scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_scout_result(slug, score, integrity, classification):
    conn = sqlite3.connect("data/scout.sqlite")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO market_scores (slug, opportunity_score, integrity_status, classification, last_scanned_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    """, (slug, score, integrity, classification))
    conn.commit()
    conn.close()

def get_top_scouted_markets(limit=5):
    if not os.path.exists("data/scout.sqlite"):
        return pd.DataFrame()
    conn = sqlite3.connect("data/scout.sqlite")
    df = pd.read_sql_query("SELECT * FROM market_scores ORDER BY opportunity_score DESC LIMIT ?", conn, params=(limit,))
    conn.close()
    return df

def load_trades():
    path = "data/trades.parquet"
    return pd.read_parquet(path) if os.path.exists(path) else pd.DataFrame()

def load_prices():
    path = "data/price_series.parquet"
    return pd.read_parquet(path) if os.path.exists(path) else pd.DataFrame()

def load_wallets():
    path = "data/wallet_summary.parquet"
    return pd.read_parquet(path) if os.path.exists(path) else pd.DataFrame()