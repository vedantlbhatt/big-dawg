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
        
        try:
            # 1. Parity Check: If this slug was just analyzed in the dashboard, use that data
            from streamlit import session_state
            if session_state.get("analysis_result") and session_state["analysis_result"].get("market_name") == slug:
                trades_df = session_state["analysis_result"]["trades_df"]
                price_series = session_state["analysis_result"]["price_series"]
                wallet_summary = session_state["analysis_result"]["wallet_summary"]
            else:
                # 2. Standard Fetch: Use same window (up to 10k) but tail for efficiency
                trades_df = fetch_trades(condition_id)
                if trades_df.empty:
                    continue
                
                # Align window to 2000 for parity (matches Dashboard depth usually)
                trades_df = trades_df.tail(2000)
                price_series = trades_df.set_index("timestamp")["price"].resample("5min").last().ffill()
                
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
