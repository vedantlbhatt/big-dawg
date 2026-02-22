import pandas as pd
from utils.fetch_data import fetch_trades
from utils.market_loader import fetch_markets
from integrity_engine.integrity_score import integrity_score
from information_engine.information import classify_market_behavior
from confidence_layer.confidence import confidence_metrics
from utils.data_loader import save_scout_result, init_scout_db, get_wallet_analysis
from utils.logic_engine import master_logic_engine
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
                
                # Calculate YES/NO Volumes on FULL history BEFORE tailing
                trades_df['outcome_norm'] = trades_df['outcome'].astype(str).str.strip().str.upper()
                yes_vol = float(trades_df[trades_df['outcome_norm'].isin(['YES', 'PURCHASE YES'])]['size'].sum())
                no_vol = float(trades_df[trades_df['outcome_norm'].isin(['NO', 'PURCHASE NO'])]['size'].sum())

                # Align window to 2000 for parity (matches Dashboard depth usually)
                trades_df = trades_df.tail(2000)
                price_series = trades_df.set_index("timestamp")["price"].resample("5min").last().ffill()
                
                wallet_summary = get_wallet_analysis(trades_df)
            
            # 3. Master Logic Engine (Single Source of Truth)
            if wallet_summary is None or wallet_summary.empty:
                wallet_summary = get_wallet_analysis(trades_df)
                
            master_res = master_logic_engine(trades_df, price_series, wallet_summary)
            opportunity_score = master_res.get("overall_score", 0)

            # 4. Calculate YES/NO Volumes (Already done above if standard fetch, but handle parity case)
            if 'yes_vol' not in locals():
                trades_df['outcome_norm'] = trades_df['outcome'].astype(str).str.strip().str.upper()
                yes_vol = float(trades_df[trades_df['outcome_norm'].isin(['YES', 'PURCHASE YES'])]['size'].sum())
                no_vol = float(trades_df[trades_df['outcome_norm'].isin(['NO', 'PURCHASE NO'])]['size'].sum())
            
            # 4. Confidence metrics for additional radar axis
            conf_res = confidence_metrics(trades_df, price_series, integrity_score=master_res["integrity"]["score"])

            save_scout_result(
                slug, 
                round(opportunity_score, 3), 
                master_res["integrity"]["status"], 
                master_res["information"]["classification"],
                event_title=row.get('event_title'),
                yes_val=yes_vol,
                no_val=no_vol,
                wallet_score=master_res["wallet_intelligence"]["score"],
                integrity_score=master_res["integrity"]["score"],
                info_score=master_res["information"]["score"],
                conf_score=conf_res["confidence_score"]
            )
            scanned_count += 1
            
        except Exception as e:
            print(f"Error scouting {slug}: {e}")
            continue
            
    return get_top_scouted_markets(limit)

def get_top_scouted_markets(limit=5):
    from utils.data_loader import get_top_scouted_markets as get_scouted
    return get_scouted(limit)
