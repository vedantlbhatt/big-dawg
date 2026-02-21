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
display_df = markets_df[["question", "volume", "slug", "conditionId"]].copy()
display_df["volume"] = display_df["volume"].apply(lambda x: f"${float(x):,.2f}" if x else "$0.00")

# Prepare formatted options for targeted analysis
ids_with_names = [f"{row['question']} | ID: {row['conditionId']}" for _, row in markets_df.iterrows()]

# Show the 10 markets in a table first
st.dataframe(display_df, use_container_width=True, hide_index=True)

# -----------------------------
# MARKET SELECTION
# -----------------------------
st.sidebar.header("Market Configuration")

# Market search/selection in the sidebar
market_search = st.sidebar.text_input("Search Market by Slug (e.g. 'will-bitcoin-hit-100k-in-2024')", "")

if not market_search:
    market_choice = st.sidebar.selectbox(
        "Or select from top markets:",
        ids_with_names
    )
    fetch_target = market_choice.split(" | ID: ")[1]
else:
    fetch_target = market_search

st.sidebar.info(f"Targeting: {fetch_target}")

# -----------------------------
# FETCH HISTORICAL DATA
# -----------------------------
if st.sidebar.button("Analyze Market", use_container_width=True):
    with st.spinner(f"Extracting signals for {fetch_target}..."):
        trades_df = fetch_trades(fetch_target)
        
        if not trades_df.empty:
            # Persist data to CSVs
            save_data(trades_df)
            
            # --- DASHBOARD LAYOUT ---
            st.divider()
            
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
                st.subheader("Price & Volume Activity")
                # Simplified price chart for demonstration
                st.line_chart(trades_df.set_index("timestamp")["price"], height=400)
                
                with st.expander("View Raw Trade Data"):
                    st.dataframe(trades_df.head(100), use_container_width=True)

            with col_chat:
                st.subheader("Intelligence Chat")
                st.markdown("Ask about market health, whale activity, or conviction levels.")
                
                if "messages" not in st.session_state:
                    st.session_state.messages = []

                # Initial bot greeting based on current engine stats
                if not st.session_state.messages:
                    greeting = f"""I've analyzed the signals for this market:
- The Integrity Scan shows it's **{integrity_res['status']}**.
- Market sentiment is leaning towards **{info_res}**.
- Overall confidence in these signals is **{conf_res['confidence_level']}**.

How can I help you interpret these findings?"""
                    st.session_state.messages.append({"role": "assistant", "content": greeting})

                # Display chat history
                for msg in st.session_state.messages:
                    role_class = "bot-bubble" if msg["role"] == "assistant" else "user-bubble"
                    st.markdown(f'<div class="chat-bubble {role_class}">{msg["content"]}</div>', unsafe_allow_html=True)

                if prompt := st.chat_input("Ask a question..."):
                    st.session_state.messages.append({"role": "human", "content": prompt})
                    # Simple rule-based response integration
                    response = "I'm analyzing that for you... "
                    if "manipulation" in prompt.lower() or "whale" in prompt.lower():
                        response += f"Based on our integrity engine, there is {integrity_res['status'].lower()} risk of manipulation."
                    elif "sentiment" in prompt.lower() or "why" in prompt.lower():
                        response += f"The Information Equality Engine classifies this movement as {info_res}."
                    elif "confidence" in prompt.lower() or "probability" in prompt.lower():
                        response += f"We have {conf_res['confidence_level']} confidence in the current price action with {int(conf_res['data_quality']*100)}% data quality."
                    else:
                        response += "The market signals are currently stable according to our triad of analysis engines."
                    
                    st.session_state.messages.append({"role": "assistant", "content": response})
                    st.rerun()

        else:
            st.sidebar.warning("No trade data found for this market.")