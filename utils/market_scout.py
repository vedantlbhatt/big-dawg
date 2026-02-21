import pandas as pd
from utils.fetch_data import fetch_trades
from utils.market_loader import fetch_markets
from integrity_engine.integrity_score import integrity_score
from information_engine.information import classify_market_behavior
from confidence_layer.confidence import confidence_metrics
from utils.data_loader import save_scout_result, init_scout_db
import time

def scout_markets(limit=10):
    """
    Scans top volume markets, performs a fast analysis, and ranks them.
    """
    init_scout_db()
    markets = fetch_markets(limit=20) # Fetch more to pick top ones
    
    scanned_count = 0
    for _, row in markets.iterrows():
        if scanned_count >= limit:
            break
            
        slug = row['slug']
        condition_id = row['conditionId']
        
        # Fast Fetch: We only need a small sample for the scout
        # Note: fetch_trades might need an optional limit for scouting speed
        # But for now, we'll use the first 500 records it returns if we can
        try:
            trades_df = fetch_trades(condition_id)
            if trades_df.empty:
                continue
                
            # Limit to last 500 for speed
            trades_df = trades_df.tail(500)
            
            price_series = trades_df.set_index("timestamp")["price"].resample("30min").last().ffill()
            
            wallet_summary = trades_df.groupby("wallet").agg(
                total_volume=("size", "sum"),
                total_trades=("size", "count"),
            ).reset_index()
            
            # Run engines
            integrity_res = integrity_score(wallet_summary, trades_df)
            info_res = classify_market_behavior(trades_df, price_series)
            conf_res = confidence_metrics(trades_df, price_series)
            
            # Opportunity Score Logic:
            # We use a weighted model to rank markets:
            # 30% Volume (Liquidity/Slippage)
            # 30% Health (Low manipulation risk)
            # 20% Informed Activity (Edge detection)
            # 20% Confidence (Price stability)
            volume_norm = min(row['volume'] / 1000000, 1) 
            health = integrity_res['score']
            is_informed = 1 if "Informed" in info_res['classification'] else 0.5
            confidence = conf_res['confidence_score']
            
            opportunity_score = (volume_norm * 0.3) + (health * 0.3) + (is_informed * 0.2) + (confidence * 0.2)
            
            save_scout_result(
                slug, 
                round(opportunity_score, 3), 
                integrity_res['status'], 
                info_res['classification']
            )
            scanned_count += 1
            
        except Exception as e:
            print(f"Error scouting {slug}: {e}")
            continue
            
    return get_top_scouted_markets(limit)

def get_top_scouted_markets(limit=5):
    from utils.data_loader import get_top_scouted_markets as get_scouted
    return get_scouted(limit)
