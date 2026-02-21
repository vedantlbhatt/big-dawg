import streamlit as st
import pandas as pd

from utils.market_loader import fetch_markets
from utils.data_loader import *
from utils.fetch_data import fetch_trades
from integrity_engine.integrity import integrity_score
from information_engine.information import classify_market_behavior
from confidence_layer.confidence import confidence_metrics

st.title("SignalLayer - Polychain Market Explorer")

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

mode = st.radio(
    "Fetch Mode", 
    ["Global Activity (Randomized Feed)", "Targeted Market Analysis"], 
    index=0,  # Setting Global as the first/default option
    horizontal=True
)

if mode == "Targeted Market Analysis":
    market_choice = st.selectbox(
        "Select a specific market to analyze:",
        ids_with_names,
        key="targeted_market_select",
    )
    # Extract ID and question from the formatted string "Question | ID: conditionId"
    selected_question = market_choice.split(" | ID: ")[0]
    selected_id = market_choice.split(" | ID: ")[1]
    st.info(f"Targeting Market: {selected_id}")
    fetch_target = selected_id
else:
    selected_question = "Global"
    st.info("Mode: Global Platform Activity. Retrieving latest trades from across all active markets.")
    fetch_target = "global"

# Session state: remember which market we last fetched so we refetch when selection changes
st.session_state.setdefault("last_fetch_target", None)
st.session_state.setdefault("last_trades_df", None)

# -----------------------------
# FETCH HISTORICAL DATA
# -----------------------------
# Refetch when: user clicks "Fetch Data" OR (targeted mode and they selected a different market)
do_fetch = st.button("Fetch Data") or (
    mode == "Targeted Market Analysis" and fetch_target != st.session_state.last_fetch_target
)

if do_fetch:
    with st.spinner(f"Pulling trades for {mode}..."):
        trades_df = fetch_trades(fetch_target)
        st.session_state.last_fetch_target = fetch_target
        st.session_state.last_trades_df = trades_df
        
        if not trades_df.empty:
            st.success(f"Retrieved {len(trades_df)} trades.")
            
            # Persist data to CSVs
            save_data(trades_df)
            st.info("Data persistenced to `data/` directory.")
            
            st.dataframe(trades_df.head(100))
            
            # -----------------------------
            # RUN ENGINES
            # -----------------------------
            st.divider()
            wallet_summary = trades_df.groupby("wallet").agg(
                total_volume=("size", "sum"),
                total_trades=("size", "count"),
            ).reset_index()
            # Build price series for confidence layer (5min buckets)
            price_series = (
                trades_df.set_index("timestamp")["price"]
                .resample("5min")
                .last()
                .dropna()
                .reset_index()
            )

            col1, col2 = st.columns(2)
            with col1:
                st.subheader("Integrity Scan")
                st.write(integrity_score(wallet_summary))
            with col2:
                st.subheader("Market Sentiment")
                st.write(classify_market_behavior(trades_df))

            st.subheader("Confidence & Disagreement")
            conf = confidence_metrics(trades_df, price_series)
            st.write(conf)
        else:
            st.warning("No trade data found for this market.")
else:
    # Show cached data if we have it for the current selection
    if st.session_state.last_fetch_target == fetch_target and st.session_state.last_trades_df is not None:
        trades_df = st.session_state.last_trades_df
        if not trades_df.empty:
            st.caption(f"Showing data for: **{selected_question if mode == 'Targeted Market Analysis' else 'Global'}** — click *Fetch Data* to refresh, or select another market.")
            save_data(trades_df)
            st.dataframe(trades_df.head(100))
            st.divider()
            wallet_summary = trades_df.groupby("wallet").agg(
                total_volume=("size", "sum"),
                total_trades=("size", "count"),
            ).reset_index()
            price_series = (
                trades_df.set_index("timestamp")["price"]
                .resample("5min")
                .last()
                .dropna()
                .reset_index()
            )
            col1, col2 = st.columns(2)
            with col1:
                st.subheader("Integrity Scan")
                st.write(integrity_score(wallet_summary))
            with col2:
                st.subheader("Market Sentiment")
                st.write(classify_market_behavior(trades_df))
            st.subheader("Confidence & Disagreement")
            st.write(confidence_metrics(trades_df, price_series))