import streamlit as st
import pandas as pd

from utils.market_loader import fetch_markets
from utils.data_loader import *
from utils.fetch_data import fetch_trades
# from integrity_engine.integrity import integrity_score
# from information_engine.information import classify_market_behavior
# from confidence_layer.confidence import confidence_metrics

st.title("SignalLayer")

# -----------------------------
# MARKET SELECTION
# -----------------------------
st.header("Select Market")

markets_df = fetch_markets()

market_choice = st.selectbox(
    "Choose a prediction market:",
    markets_df["question"]
)

selected_slug = markets_df[
    markets_df["question"] == market_choice
]["slug"].values[0]

# -----------------------------
# FETCH DATA
# -----------------------------
st.write("Fetching market data...")

# trades_df = fetch_trades(selected_slug)

# Build derived datasets in-memory
# price_series = trades_df.set_index("timestamp")["price"].resample("1min").mean().dropna().reset_index()

# wallet_summary = trades_df.groupby("wallet").agg(
#     total_volume=("size", "sum"),
#     total_trades=("size", "count"),
# ).reset_index()

# -----------------------------
# RUN ENGINES
# -----------------------------

st.header("Integrity")
# st.write(integrity_score(wallet_summary))

st.header("Market Behavior")
# st.write(classify_market_behavior(trades_df))

st.header("Confidence Layer")
# st.write(confidence_metrics(trades_df, price_series))