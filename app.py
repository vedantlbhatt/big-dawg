import streamlit as st
import pandas as pd

from utils.market_loader import fetch_markets
from utils.data_loader import *
from utils.fetch_data import fetch_trades
from integrity_engine.integrity import integrity_score
from information_engine.information import classify_market_behavior
from confidence_layer.confidence import confidence_metrics

st.set_page_config(page_title="SignalLayer | Polymarket Intelligence", layout="wide")

# Load custom CSS
if os.path.exists("style.css"):
    with open("style.css") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("SignalLayer")
st.markdown("### Advanced Polymarket Intelligence Dashboard")

# -----------------------------
# MARKET DISCOVERY
# -----------------------------
st.header("Available Markets")

markets_df = fetch_markets()

# Create a cleaner display for the user
display_df = markets_df[["event_title", "question", "volume", "slug", "conditionId"]].copy()
display_df["volume"] = display_df["volume"].apply(lambda x: f"${float(x):,.2f}" if x else "$0.00")

# Show the markets in a table first
st.dataframe(display_df, use_container_width=True, hide_index=True)

# -----------------------------
# MARKET SELECTION
# -----------------------------
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
            
            # Persist data to CSVs
            save_data(trades_df)
            
            # --- DASHBOARD LAYOUT ---
            st.divider()
            st.subheader(f"Analyzed Market: {selected_market_name if not market_search else market_search}")
            
            # Top Metrics Row
            m1, m2, m3 = st.columns(3)
            
            # Integrity Engine Output
            wallet_summary = trades_df.groupby("wallet").agg(
                total_volume=("size", "sum"),
                total_trades=("size", "count"),
            ).reset_index()
            integrity_res = integrity_score(wallet_summary)
            
            with m1:
                st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                st.write("**INTEGRITY STATUS**")
                status_emoji = "🟢" if integrity_res["status"] == "Clean" else "🔴"
                st.subheader(f"{status_emoji} {integrity_res['status']}")
                st.markdown('</div>', unsafe_allow_html=True)
            
            # Information Equality Engine Output
            info_res = classify_market_behavior(trades_df)
            with m2:
                st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                st.write("**MARKET SENTIMENT**")
                st.subheader(f"🧠 {info_res}")
                st.markdown('</div>', unsafe_allow_html=True)
                
            # Confidence Layer Output
            # Note: For multi-slug, price series might be noisy if prices differ wildly, 
            # but usually for the same event they are related (e.g. YES/NO)
            price_series = trades_df.set_index("timestamp")["price"].resample("5min").last().ffill()
            conf_res = confidence_metrics(trades_df, price_series)
            with m3:
                st.markdown('<div class="metric-card">', unsafe_allow_html=True)
                st.write("**CONFIDENCE SCORE**")
                st.subheader(f"📊 {int(conf_res['data_quality'] * 100)}% ({conf_res['confidence_level']})")
                st.markdown('</div>', unsafe_allow_html=True)

            st.write("---")
            
            # Main Content Area
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
                    greeting = f"""I've extracted signals for the market: **{selected_market_name if not market_search else market_search}**
- The Integrity Scan shows it's **{integrity_res['status']}**.
- Overall sentiment is **{info_res}**.
- Confidence is **{conf_res['confidence_level']}**.

How can I help you interpret this market data?"""
                    st.session_state.messages.append({"role": "assistant", "content": greeting})

                for msg in st.session_state.messages:
                    role_class = "bot-bubble" if msg["role"] == "assistant" else "user-bubble"
                    st.markdown(f'<div class="chat-bubble {role_class}">{msg["content"]}</div>', unsafe_allow_html=True)

                if prompt := st.chat_input("Ask a question..."):
                    st.session_state.messages.append({"role": "human", "content": prompt})
                    response = "Analysing market data... "
                    if "manipulation" in prompt.lower() or "whale" in prompt.lower():
                        response += f"The integrity status for this market is {integrity_res['status'].lower()}."
                    elif "sentiment" in prompt.lower():
                        response += f"The market movement indicates {info_res}."
                    else:
                        response += "The signal remains stable for this market."
                    
                    st.session_state.messages.append({"role": "assistant", "content": response})
                    st.rerun()
        else:
            st.sidebar.warning("No trade data found for any of the selected markets.")
