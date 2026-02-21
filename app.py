import os
from dotenv import load_dotenv
load_dotenv()

import streamlit as st
import pandas as pd

from utils.market_loader import fetch_markets
from utils.data_loader import *
from utils.fetch_data import fetch_trades
from integrity_engine.integrity_score import integrity_score
from information_engine.information import classify_market_behavior
from confidence_layer.confidence import confidence_metrics
from utils.logic_engine import master_logic_engine
from utils.recommendation_engine import get_recommendation
from utils.market_scout import scout_markets, get_top_scouted_markets
from utils.gemini_chat import chat_with_stats

st.set_page_config(page_title="SignalLayer | Polymarket Intelligence", layout="wide")

# Load custom CSS
if os.path.exists("style.css"):
    with open("style.css") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("SignalLayer")
st.markdown("### Advanced Polymarket Intelligence Dashboard")

# Init DB
init_scout_db()

# -----------------------------
# MARKET DISCOVERY
# -----------------------------
st.header("Global Market Discovery")

markets_df = fetch_markets()

# Create a cleaner display for the user
display_df = markets_df[["event_title", "question", "volume", "slug", "conditionId"]].copy()
display_df["volume"] = display_df["volume"].apply(lambda x: f"${float(x):,.2f}" if x else "$0.00")

# Show the markets in a table first
st.dataframe(display_df, use_container_width=True, hide_index=True)

# Market Scout Section
with st.expander("🔍 Global Opportunity Scout", expanded=False):
    st.markdown("Scan top volume markets for high-integrity, informed trade opportunities.")
    if st.button("Run Global Scout (10 Markets)", use_container_width=True):
        with st.spinner("Scouting global markets..."):
            scout_markets(limit=10)
    
    top_scouted = get_top_scouted_markets(5)
    if not top_scouted.empty:
        st.write("### 🔥 Top Opportunities Found")
        st.dataframe(top_scouted, use_container_width=True, hide_index=True)
    else:
        st.info("Run the scout to see recommended slugs.")

# -----------------------------
# MARKET SELECTION
# -----------------------------
st.sidebar.header("Navigation")
st.sidebar.page_link("app.py", label="Main Dashboard", icon="📊")
st.sidebar.page_link("pages/wallet_intelligence.py", label="Wallet Intelligence", icon="🕵️‍♂️")
st.sidebar.divider()
st.sidebar.header("Market Configuration")

# Market search/selection in the sidebar
market_search = st.sidebar.text_input("Search Market by Slug (e.g. 'will-bitcoin-hit-100k-in-2024')", "")

if not market_search:
    # 1. Select Event
    unique_events = sorted(markets_df["event_title"].unique())
    event_choice = st.sidebar.selectbox(
        "Step 1: Select an Event",
        unique_events
    )
    
    # 2. Filter markets for the selected event
    event_markets = markets_df[markets_df["event_title"] == event_choice]
    
    # We want to select ALL associated with an event by default
    slug_options = {f"{row['question']}": row['conditionId'] for _, row in event_markets.iterrows()}
    
    selected_market_name = st.sidebar.selectbox(
        "Step 2: Select a slug to analyze",
        options=list(slug_options.keys())
    )
    
    fetch_targets = [slug_options[selected_market_name]]
else:
    fetch_targets = [market_search]

if not fetch_targets:
    st.sidebar.warning("Please select at least one market.")
    st.stop()

st.sidebar.info(f"Analyzing {len(fetch_targets)} market(s)")

# Session state: remember which market we last fetched so we refetch when selection changes
st.session_state.setdefault("last_fetch_target", None)
st.session_state.setdefault("last_trades_df", None)

# Session state: remember which market we last fetched so we refetch when selection changes
st.session_state.setdefault("last_fetch_target", None)
st.session_state.setdefault("last_trades_df", None)
# Persist analysis so dashboard + chat stay visible after rerun (e.g. after sending a chat message)
st.session_state.setdefault("analysis_result", None)

# -----------------------------
# FETCH & AGGREGATE DATA
# -----------------------------
if st.sidebar.button("Analyze Market", use_container_width=True):
    all_trades = []
    with st.spinner(f"Extracting signals for {fetch_targets[0]}..."):
        for target in fetch_targets:
            df = fetch_trades(target)
            if not df.empty:
                all_trades.append(df)
        if all_trades:
            trades_df = pd.concat(all_trades).drop_duplicates(subset=["tx_id"]).sort_values("timestamp")
            save_data(trades_df)
            price_series = trades_df.set_index("timestamp")["price"].resample("5min").last().ffill()
            
            # Use unified logic engine
            wallet_summary = get_wallet_analysis(trades_df)
            master_res = master_logic_engine(trades_df, price_series, wallet_summary)
            conf_res = confidence_metrics(trades_df, price_series)
            
            st.session_state.analysis_result = {
                "trades_df": trades_df,
                "price_series": price_series,
                "wallet_summary": wallet_summary,
                "master_res": master_res,
                "integrity_res": master_res["integrity"],
                "info_res": master_res["information"],
                "conf_res": conf_res,
                "market_name": selected_market_name if not market_search else market_search,
            }
            st.session_state.messages = []
            st.rerun()
        else:
            st.sidebar.warning("No trade data found for any of the selected markets.")

# Show dashboard + chat whenever we have a persisted analysis (so chat survives reruns)
if st.session_state.analysis_result is not None:
    ar = st.session_state.analysis_result
    trades_df = ar["trades_df"]
    price_series = ar["price_series"]
    integrity_res = ar["integrity_res"]
    info_res = ar["info_res"]
    conf_res = ar["conf_res"]
    market_name = ar["market_name"]

    st.divider()
    st.subheader(f"Analyzed Market: {market_name}")

    # Main Metrics Row
    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.write("**INTEGRITY STATUS**")
        st.subheader(ar["integrity_res"]["status"])
    with m2:
        st.write("**MARKET SENTIMENT**")
        st.subheader(ar["info_res"]["classification"])
    with m3:
        st.write("**STAR WALLETS**")
        st.subheader(f"✨ {ar['master_res']['wallet_intelligence']['star_count']}")
    with m4:
        st.write("**SIGNALLAYER SCORE**")
        st.subheader(f"🎯 {int(ar['master_res']['overall_score'] * 100)}%")

    # AI Recommendation Layer (Master)
    rec = get_recommendation(ar["integrity_res"], ar["info_res"], ar["conf_res"])
    st.markdown(f"""
    <div style="background-color: {rec['color']}33; border: 1px solid {rec['color']}; border-radius: 10px; padding: 20px; margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="color: {rec['color']}; margin-top: 0;">AI RECOMMENDED ACTION: {rec['action']}</h3>
            <span style="font-size: 1.5em;">{ar['master_res']['verdict'].upper()}</span>
        </div>
        <p style="font-size: 1.1em; line-height: 1.5;">{rec['reasoning']}</p>
    </div>
    """, unsafe_allow_html=True)

    with st.expander("🛠 View Master Logic Engine JSON", expanded=False):
        st.json(ar["master_res"])

    st.write("---")
    col_main, col_chat = st.columns([1.5, 1])

    with col_main:
        st.subheader("Price & Volume Activity (Aggregated)")
        st.line_chart(trades_df.set_index("timestamp")["price"], height=400)
        with st.expander("View Raw Trade Data"):
            st.dataframe(trades_df.head(100), use_container_width=True)

    with col_chat:
        st.subheader("Intelligence Chat")
        if "messages" not in st.session_state:
            st.session_state.messages = []
        if not st.session_state.messages:
            greeting = f"""I've extracted signals for the market: **{market_name}**
- The Integrity Scan shows it's **{integrity_res['status']}** (Score: {integrity_res['score']:.2f}).
- Overall sentiment is **{info_res['classification']}** (Informed: {info_res['components']['informed_score']:.2f}, Retail: {info_res['components']['retail_score']:.2f}, Whale: {info_res['components']['whale_score']:.2f}).
- Confidence is **{conf_res['confidence_level']}** ({int(conf_res['data_quality'] * 100)}%).
- **AI Recommendation**: {rec['action']}

{rec['reasoning']}

How can I help you interpret this market data?"""
            st.session_state.messages.append({"role": "assistant", "content": greeting})

        for msg in st.session_state.messages:
            role_class = "bot-bubble" if msg["role"] == "assistant" else "user-bubble"
            st.markdown(f'<div class="chat-bubble {role_class}">{msg["content"]}</div>', unsafe_allow_html=True)

        if prompt := st.chat_input("Ask a question..."):
            st.session_state.messages.append({"role": "human", "content": prompt})
            response = chat_with_stats(
                integrity_res, info_res, conf_res,
                prompt,
                history=st.session_state.messages[:-1],
            )
            st.session_state.messages.append({"role": "assistant", "content": response})
            st.rerun()
