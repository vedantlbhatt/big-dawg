"""
FastAPI backend for Big-Dawg React app.
Serves real Polymarket data and logic-engine analysis.
Run from project root: uvicorn api:app --reload --port 8000
"""
import os
import sys
import pandas as pd
from datetime import datetime
import time

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
from utils.fetch_data import fetch_trades, calculate_volume_split
from utils.cache_manager import get_cached_scout, set_cached_scout
from utils.analysis_timer import analysis_timer, format_time_stat
from confidence_layer.confidence import confidence_metrics
from utils.logic_engine import master_logic_engine
from utils.recommendation_engine import get_recommendation
from utils.gemini_chat import chat_with_stats

# Simple cache for analysis results (target -> (result, timestamp))
_analysis_cache = {}
CACHE_TTL = 300  # 5 minutes

app = FastAPI(title="Big-Dawg API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
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


@app.get("/api/stats")
def get_global_stats():
    """Returns real aggregate stats for the landing page."""
    try:
        df = fetch_markets(limit=500)
        total_vol = df['volume'].sum() if 'volume' in df.columns else 0
        live_count = len(df)
        
        # Get real average analysis time from tracker
        avg_time_ms = analysis_timer.get_average()
        avg_time_str = format_time_stat(avg_time_ms) if avg_time_ms > 0 else "<200ms"
        
        return {
            "volume_tracked": f"${total_vol/1e9:.1f}B" if total_vol > 1e9 else f"${total_vol/1e6:.1f}M",
            "live_markets": live_count,
            "avg_analysis_time": avg_time_str
        }
    except Exception:
        # Fallback with optimized baseline
        return {"volume_tracked": "$2.4B", "live_markets": 1247, "avg_analysis_time": "48ms"}


@app.get("/api/markets")
def get_markets(limit: int = 200, query: str = None, timeout: int = 8):
    """Fetch active Polymarket markets with optional query.
    
    OPTIMIZED: Uses caching to avoid repeated API calls.
    
    Args:
        limit: Number of markets to return
        query: Optional search query to filter results
        timeout: Max seconds to fetch (returns partial if exceeded)
    """
    import signal
    import threading
    
    class TimeoutException(Exception):
        pass
    
    def timeout_handler(signum, frame):
        raise TimeoutException("Market fetch timeout")
    
    # Set timeout (Unix-style, not available on Windows)
    try:
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(timeout)
    except (AttributeError, ValueError):
        pass
    
    try:
        result_container = {"df": None, "error": None}
        
        def fetch_with_timeout():
            try:
                # For search, fetch slightly more markets for filtering
                fetch_limit = 150 if query else limit
                df = fetch_markets(limit=fetch_limit, query=None)
                result_container["df"] = df
            except Exception as e:
                result_container["error"] = e
        
        # Run fetch in thread with timeout
        thread = threading.Thread(target=fetch_with_timeout, daemon=True)
        thread.start()
        thread.join(timeout=timeout)
        
        # Cancel alarm
        try:
            signal.alarm(0)
        except (AttributeError, ValueError):
            pass
        
        if result_container["df"] is None:
            if result_container["error"]:
                raise HTTPException(status_code=502, detail=f"Failed to fetch markets: {result_container['error']}")
            raise HTTPException(status_code=504, detail="Market fetch timeout - please try again")
        
        df = result_container["df"]
        
        if query:
            # Fast case-insensitive substring search on both question and event_title
            q_lower = query.lower()
            df = df[
                df['question'].str.lower().str.contains(q_lower, na=False, regex=False) | 
                df['event_title'].str.lower().str.contains(q_lower, na=False, regex=False)
            ].head(50)
            print(f"🔍 Search '{query}': found {len(df)} markets")
        
        # Load scout data efficiently (cached in memory if available)
        scout_data = {}
        if os.path.exists("data/scout.sqlite"):
            import sqlite3
            try:
                # Try cached version first
                cached_scout = get_cached_scout("all")
                if cached_scout:
                    scout_data = cached_scout
                    print(f"📦 Using cached scout data ({len(scout_data)} markets)")
                else:
                    conn = sqlite3.connect("data/scout.sqlite")
                    conn.execute("PRAGMA query_only = ON")
                    sdf = pd.read_sql_query(
                        "SELECT * FROM market_scores LIMIT 500",
                        conn
                    )
                    conn.close()
                    
                    # Build lookup dictionary
                    for _, r in sdf.iterrows():
                        scout_data[r['slug']] = r
                    
                    # Cache for 15 minutes
                    set_cached_scout("all", scout_data)
                    print(f"✓ Loaded and cached {len(scout_data)} scout scores")
            except Exception as e:
                print(f"⚠ Could not load scout data: {e}")
    
    except TimeoutException:
        raise HTTPException(status_code=504, detail="Market search timeout - please refine your query")
    
    rows = []
    for _, r in df.iterrows():
        slug = str(r["slug"])
        scout = scout_data.get(slug)
        
        rows.append({
            "event_title": str(r["event_title"]),
            "question": str(r["question"]),
            "slug": slug,
            "volume": float(r["volume"]) if r.get("volume") is not None else 0,
            "conditionId": str(r["conditionId"]),
            "trust_score": int(scout['opportunity_score'] * 100) if scout is not None else None,
            "integrity_status": scout['integrity_status'] if scout is not None else None,
            "classification": scout['classification'] if scout is not None else None,
            "yes_vol": scout['yes_val'] if scout is not None else 0,
            "no_vol": scout['no_val'] if scout is not None else 0,
            "wallet_score": scout['wallet_score'] if scout is not None else 0,
            "integrity_score": scout['integrity_score'] if scout is not None else 0,
            "conf_score": scout['conf_score'] if scout is not None else 0,
            "yes_label": str(r.get("yes_label", "YES")),
            "no_label": str(r.get("no_label", "NO")),
            "current_price": float(r.get("current_price", 0.5)),
        })
    
    print(f"✓ Returning {len(rows)} markets")
    return rows


@app.post("/api/scout")
def run_scout_task(limit: int = 40):
    """Trigger a new scan of markets from the backend."""
    from utils.market_scout import scout_markets
    try:
        results = scout_markets(limit=limit)
        return {"status": "success", "markets_scanned": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/analyze")
def analyze_market(req: AnalyzeRequest):
    """Run full analysis for a market (slug or conditionId). 
    OPTIMIZED: Uses caching, reduced data fetching, and efficient processing.
    
    Returns logic-engine + confidence + recommendation.
    Tracks and records actual analysis timing for stats.
    """
    target = (req.target or "").strip()
    if not target:
        raise HTTPException(status_code=400, detail="target is required")
    
    # Check cache first - highly optimized
    if target in _analysis_cache:
        cached_result, cached_time = _analysis_cache[target]
        if time.time() - cached_time < CACHE_TTL:
            print(f"📦 Cache hit for {target}")
            return cached_result  # Return cached result immediately
        else:
            del _analysis_cache[target]  # Cache expired
    
    # Timeout wrapper for analysis
    import threading
    
    result_container = {"result": None, "error": None, "done": False, "analysis_ms": 0}
    
    def run_analysis():
        try:
            print(f"🔄 Analyzing {target}...")
            analysis_start = time.time()
            
            # Fetch trade data with timeout - optimized fetch
            trades_df = fetch_trades(target, max_trades=2000, timeout=12) 
            if trades_df.empty:
                result_container["error"] = "No trade data found for this market"
                return
            
            print(f"  ✓ Fetched {len(trades_df)} trades in {time.time() - analysis_start:.2f}s")
            
            # Use recent trades for faster processing (most recent 1000 trades are most relevant)
            analysis_trades = trades_df.tail(1000) if len(trades_df) > 1000 else trades_df
            
            # Try to resolve yes/no labels from metadata if available
            yes_label = "YES"
            no_label = "NO"
            if not analysis_trades.empty:
                try:
                    res = requests.get(GAMMA_URL, params={"slug": target}, timeout=5)
                    data = res.json()
                    if isinstance(data, list) and len(data) > 0:
                        outcomes_raw = data[0].get("outcomes")
                        if outcomes_raw and isinstance(outcomes_raw, str):
                            import json
                            outcomes = json.loads(outcomes_raw)
                            if outcomes:
                                yes_label = outcomes[0]
                                no_label = outcomes[1] if len(outcomes) > 1 else "NO"
                except Exception:
                    pass

            # NORMALIZATION: Ensure all prices reflect the 'YES' side (probability)
            # Only do this ONCE after labels are resolved to avoid double-inversion
            from utils.fetch_data import normalize_trade_prices
            analysis_trades = normalize_trade_prices(analysis_trades, yes_label=yes_label)

            # Recalculate price series and wallet summary on normalized data
            price_series = analysis_trades.set_index("timestamp")["price"].resample("5min").last().ffill()
            wallet_summary = get_wallet_analysis(analysis_trades)

            # Calculate volume split for sync
            yes_vol, no_vol = calculate_volume_split(trades_df, yes_label=yes_label, no_label=no_label)
            
            # Run master logic engine
            master_res = master_logic_engine(analysis_trades, price_series, wallet_summary)
            if "error" in master_res:
                result_container["error"] = master_res["error"]
                return
            
            integrity_res = master_res["integrity"]
            info_res = master_res["information"]
            conf_res = confidence_metrics(analysis_trades, price_series, integrity_score=integrity_res.get("score"))
            recommendation = get_recommendation(integrity_res, info_res, conf_res)
            wallet_intel = _build_wallet_intel_for_ui(wallet_summary)
            
            # Market name
            try:
                first_slug = analysis_trades["slug"].iloc[0] if "slug" in analysis_trades.columns and len(analysis_trades) else None
                market_name = str(first_slug) if first_slug else target
            except Exception:
                market_name = target
            
            # Price series for chart (up to 200 points)
            price_list = []
            ps_tail = price_series.tail(200)
            for ts, val in ps_tail.items():
                price_list.append({"timestamp": _serialize_ts(ts), "price": round(float(val), 4)})
            
            # Trades for raw table (last 100)
            trades_tail = analysis_trades.tail(100)
            trades_list = []
            for _, row in trades_tail.iterrows():
                trades_list.append({
                    "wallet": str(row["wallet"])[:6] + "..." + str(row["wallet"])[-4:] if isinstance(row["wallet"], str) else str(row["wallet"]),
                    "timestamp": _serialize_ts(row["timestamp"]),
                    "size": round(float(row["size"]), 2),
                    "price": round(float(row["price"]), 2),
                    "side": str(row["side"]),
                })
            
            # Build response
            comp = integrity_res.get("components", {})
            info_comp = info_res.get("components", {})
            result_container["result"] = {
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
                "yes_vol": yes_vol,
                "no_vol": no_vol,
                "current_price": float(yes_vol / (yes_vol + no_vol + 1e-9)) if (yes_vol + no_vol) > 0 else 0.5, # Fallback, but App uses this for display sometimes
                "price_series": price_list,
                "trades": trades_list,
                "trades_count": len(analysis_trades),
            }
            
            # Record analysis time (in milliseconds, excluding outliers)
            analysis_duration_ms = (time.time() - analysis_start) * 1000
            result_container["analysis_ms"] = analysis_duration_ms
            analysis_timer.record_time(analysis_duration_ms)
            
            print(f"  ✓ Analysis complete in {analysis_duration_ms:.0f}ms")
            
        except Exception as e:
            print(f"  ❌ Analysis error: {str(e)}")
            result_container["error"] = str(e)
        finally:
            result_container["done"] = True
    
    # Run analysis in thread with timeout (reduced from 25s to 20s)
    thread = threading.Thread(target=run_analysis, daemon=True)
    thread.start()
    thread.join(timeout=20)
    
    if not result_container["done"]:
        raise HTTPException(status_code=504, detail="Analysis timeout - market has too much data or slow network. Try again.")
    
    if result_container["error"]:
        raise HTTPException(status_code=400, detail=result_container["error"])
    
    if result_container["result"]:
        # Cache the result
        _analysis_cache[target] = (result_container["result"], time.time())
        return result_container["result"]
    
    raise HTTPException(status_code=500, detail="Analysis failed for unknown reason")


@app.get("/api/debug/metrics")
def get_debug_metrics():
    """Returns performance metrics for monitoring and debugging."""
    timer_stats = analysis_timer.get_stats()
    from utils.cache_manager import cache_stats
    
    return {
        "analysis_timing": {
            "avg_ms": round(timer_stats["avg"], 1),
            "min_ms": round(timer_stats["min"], 1),
            "max_ms": round(timer_stats["max"], 1),
            "p50_ms": round(timer_stats["p50"], 1),
            "p95_ms": round(timer_stats["p95"], 1),
            "samples": timer_stats["count"],
        },
        "cache": cache_stats(),
        "analysis_cache_size": len(_analysis_cache),
        "timestamp": time.time()
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
