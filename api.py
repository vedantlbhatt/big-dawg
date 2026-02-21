"""
FastAPI backend for Big-Dawg React app.
Serves real Polymarket data and logic-engine analysis.
Run from project root: uvicorn api:app --reload --port 8000
"""
import os
import sys
from datetime import datetime

# Run from project root
if os.path.dirname(os.path.abspath(__file__)) not in sys.path:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from utils.market_loader import fetch_markets
from utils.data_loader import get_wallet_analysis
from utils.fetch_data import fetch_trades
from confidence_layer.confidence import confidence_metrics
from utils.logic_engine import master_logic_engine
from utils.recommendation_engine import get_recommendation
from utils.gemini_chat import chat_with_stats

app = FastAPI(title="Big-Dawg API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Request/Response models ----------
class AnalyzeRequest(BaseModel):
    target: str  # slug or conditionId


class ChatRequest(BaseModel):
    integrity_res: dict
    info_res: dict
    conf_res: dict
    message: str
    history: list[dict]


def _serialize_ts(ts):
    if ts is None:
        return None
    if hasattr(ts, "isoformat"):
        return ts.isoformat()
    return str(ts)


def _build_wallet_intel_for_ui(wallet_summary, top_n=5):
    """Build wallet intel from wallet_summary for React UI: lean, divergence, wallets with belief/side."""
    if wallet_summary is None or wallet_summary.empty:
        return {
            "lean": "split",
            "leanPct": 50,
            "divergence": "Medium",
            "wallets": [],
        }
    import pandas as pd
    # Sort by cost_basis desc to get top wallets by size
    df = wallet_summary.sort_values("cost_basis", ascending=False).head(top_n)
    if df.empty:
        return {"lean": "split", "leanPct": 50, "divergence": "Medium", "wallets": []}
    # Belief = avg_entry_price as 0-100 (YES probability)
    beliefs = (df["avg_entry_price"] * 100).clip(0, 100)
    yes_count = (df["net_position"] > 0).sum()
    no_count = (df["net_position"] < 0).sum()
    if yes_count > no_count:
        lean = "yes"
        lean_pct = round(beliefs.mean())
    elif no_count > yes_count:
        lean = "no"
        lean_pct = round(100 - beliefs.mean())
    else:
        lean = "split"
        lean_pct = 50
    std_belief = beliefs.std()
    if pd.isna(std_belief) or std_belief < 8:
        divergence = "Low"
    elif std_belief < 25:
        divergence = "Medium"
    else:
        divergence = "High"
    wallets = []
    for i, (_, row) in enumerate(df.iterrows()):
        belief_pct = round(float(row["avg_entry_price"] * 100))
        side = "yes" if row["net_position"] > 0 else "no"
        addr = row["wallet"]
        short_addr = f"{addr[:6]}...{addr[-4:]}" if isinstance(addr, str) and len(addr) > 12 else str(addr)
        vol = f"${float(row['cost_basis']):,.0f}"
        badge = None
        badge_lbl = None
        if float(row["roi"]) >= 0.2:
            badge, badge_lbl = "streak", "Win streak"
        elif row["cost_basis"] > 5000:
            badge, badge_lbl = "heavy", "High conviction"
        else:
            badge, badge_lbl = "early", "Early entry"
        wallets.append({
            "label": f"#{i+1}" if i >= 3 else ["🏆 #1", "🥈 #2", "🥉 #3"][i],
            "addr": short_addr,
            "belief": belief_pct,
            "side": side,
            "badge": badge,
            "badgeLbl": badge_lbl,
            "vol": vol,
            "rank": f"Top {(i+1)*5}%",
        })
    return {
        "lean": lean,
        "leanPct": lean_pct,
        "divergence": divergence,
        "wallets": wallets,
    }


@app.get("/api/markets")
def get_markets(limit: int = 200):
    """Fetch active Polymarket markets (real data)."""
    try:
        df = fetch_markets(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch markets: {e}")
    rows = []
    for _, r in df.iterrows():
        rows.append({
            "event_title": str(r["event_title"]),
            "question": str(r["question"]),
            "slug": str(r["slug"]),
            "volume": float(r["volume"]) if r.get("volume") is not None else 0,
            "conditionId": str(r["conditionId"]),
        })
    return rows


@app.post("/api/analyze")
def analyze_market(req: AnalyzeRequest):
    """Run full analysis for a market (slug or conditionId). Returns logic-engine + confidence + recommendation."""
    target = (req.target or "").strip()
    if not target:
        raise HTTPException(status_code=400, detail="target is required")
    try:
        trades_df = fetch_trades(target)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch trades: {e}")
    if trades_df.empty:
        raise HTTPException(status_code=404, detail="No trade data found for this market")
    # Resample price for confidence
    price_series = trades_df.set_index("timestamp")["price"].resample("5min").last().ffill()
    wallet_summary = get_wallet_analysis(trades_df)
    master_res = master_logic_engine(trades_df, price_series, wallet_summary)
    if "error" in master_res:
        raise HTTPException(status_code=400, detail=master_res["error"])
    integrity_res = master_res["integrity"]
    info_res = master_res["information"]
    conf_res = confidence_metrics(trades_df, price_series, integrity_score=integrity_res.get("score"))
    recommendation = get_recommendation(integrity_res, info_res, conf_res)
    wallet_intel = _build_wallet_intel_for_ui(wallet_summary)
    # Market name: use slug from first row or target
    try:
        first_slug = trades_df["slug"].iloc[0] if "slug" in trades_df.columns and len(trades_df) else None
        market_name = str(first_slug) if first_slug else target
    except Exception:
        market_name = target
    # Price series for chart
    price_list = []
    for ts, val in price_series.items():
        price_list.append({"timestamp": _serialize_ts(ts), "price": round(float(val), 4)})
    # Trades for raw table (last 100)
    trades_tail = trades_df.tail(100)
    trades_list = []
    for _, row in trades_tail.iterrows():
        trades_list.append({
            "wallet": str(row["wallet"])[:6] + "..." + str(row["wallet"])[-4:] if isinstance(row["wallet"], str) else str(row["wallet"]),
            "timestamp": _serialize_ts(row["timestamp"]),
            "size": round(float(row["size"]), 2),
            "price": round(float(row["price"]), 2),
            "side": str(row["side"]),
        })
    # Integrity components for tiles (same keys as frontend expects)
    comp = integrity_res.get("components", {})
    info_comp = info_res.get("components", {})
    return {
        "market_name": market_name,
        "integrity_res": {
            "score": integrity_res.get("score", 0),
            "status": integrity_res.get("status", ""),
            "components": {
                "whale_risk": comp.get("whale_risk", 0),
                "price_impact_risk": comp.get("price_impact_risk", 0),
                "liquidity_risk": comp.get("liquidity_risk", 0),
                "flip_risk": comp.get("flip_risk", 0),
                "cluster_risk": comp.get("cluster_risk", 0),
            },
        },
        "info_res": {
            "classification": info_res.get("classification", ""),
            "components": {
                "informed_score": info_comp.get("informed_score", 0),
                "retail_score": info_comp.get("retail_score", 0),
                "whale_score": info_comp.get("whale_score", 0),
            },
        },
        "conf_res": {
            "probability": conf_res.get("probability", 0),
            "disagreement_std": conf_res.get("disagreement_std", 0),
            "disagreement": conf_res.get("disagreement", "Medium"),
            "confidence_score": conf_res.get("confidence_score", 0),
            "data_quality": conf_res.get("data_quality", 0),
            "confidence_level": conf_res.get("confidence_level", "Medium"),
            "conviction_score": conf_res.get("conviction_score"),
        },
        "master_res": {
            "market_stats": master_res.get("market_stats", {}),
            "integrity": integrity_res,
            "information": info_res,
            "wallet_intelligence": master_res.get("wallet_intelligence", {}),
            "overall_score": master_res.get("overall_score", 0),
            "verdict": master_res.get("verdict", "Neutral"),
        },
        "recommendation": recommendation,
        "wallet_intel": wallet_intel,
        "price_series": price_list,
        "trades": trades_list,
        "trades_count": len(trades_df),
    }


@app.post("/api/chat")
def chat(req: ChatRequest):
    """AI chat with dashboard stats context (Gemini)."""
    try:
        response = chat_with_stats(
            req.integrity_res,
            req.info_res,
            req.conf_res,
            req.message,
            history=req.history,
        )
        return {"response": response or ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
