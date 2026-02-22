import pandas as pd
import json
from integrity_engine.integrity_score import integrity_score
from information_engine.information import classify_market_behavior
from utils.data_loader import get_wallet_analysis

def master_logic_engine(trades_df, price_series, wallet_summary=None):
    """
    Unified engine that synthesizes signals from Integrity, Information, and Wallet Intelligence.
    Returns a comprehensive JSON object with scores and an overall weighted average.
    """
    if trades_df.empty:
        return {"error": "No trade data provided"}

    # 1. Integrity Engine
    # If wallet_summary isn't provided, calculate it
    if wallet_summary is None or wallet_summary.empty:
        wallet_summary = get_wallet_analysis(trades_df)
    
    integrity_res = integrity_score(wallet_summary, trades_df)
    integrity_score_val = integrity_res.get("score", 0)
    
    # 2. Information Engine
    info_res = classify_market_behavior(trades_df, price_series)
    # Information score: Informed (1.0) vs Noise (0.0)
    info_score_val = 1.0 if "Informed" in info_res.get("classification", "") else 0.5
    if "Noise" in info_res.get("classification", ""):
        info_score_val = 0.2
        
    # 3. Wallet Intelligence layer (ROI Stars)
    # Identification logic: 15% ROI + >$10 cost basis
    stars = wallet_summary[(wallet_summary["roi"] >= 0.15) & (wallet_summary["cost_basis"] > 10)]
    
    star_count = len(stars)
    total_star_capital = stars["cost_basis"].sum()
    
    # Wallet Score normalized: 
    # High capital and star count = 1.0
    # We'll use a log scale or simple threshold for the demo
    # e.g., 5+ stars or $1000+ star capital = high confidence
    wallet_score_val = min((star_count / 10) + (total_star_capital / 5000), 1.0)

    # 4. Overall Weighted Score
    # Weights: Wallet (50%), Integrity (25%), Information (25%)
    weights = {
        "wallet": 0.50,
        "integrity": 0.15,
        "info": 0.35
    }
    
    raw_score = (
        (wallet_score_val * weights["wallet"]) +
        (integrity_score_val * weights["integrity"]) +
        (info_score_val * weights["info"])
    )
    
    # Normalize to [0.4, 1.0] range (40% to 100%)
    overall_score = 0.4 + (raw_score * 0.6)

    # 5. Build JSON Summary
    summary = {
        "market_stats": {
            "total_trades": len(trades_df),
            "unique_wallets": len(wallet_summary),
            "latest_price": float(trades_df["price"].iloc[-1])
        },
        "integrity": {
            "score": round(integrity_score_val, 2),
            "status": integrity_res.get("status", "Unknown"),
            "risk_factors": integrity_res.get("risk_factors", []),
            "components": integrity_res.get("components", {})
        },
        "information": {
            "score": round(info_score_val, 2),
            "classification": info_res.get("classification", "Unknown"),
            "primary_driver": info_res.get("primary_driver", "Unknown"),
            "components": info_res.get("components", {})
        },
        "wallet_intelligence": {
            "score": round(wallet_score_val, 2),
            "star_count": star_count,
            "aggregate_star_capital": round(float(total_star_capital), 2),
            "stars": stars[["wallet", "roi", "cost_basis"]].head(10).to_dict(orient="records")
        },
        "overall_score": round(overall_score, 2),
        "verdict": "Bullish" if overall_score > 0.7 else "Neutral" if overall_score > 0.4 else "Caution"
    }

    return summary
