import pandas as pd

def load_trades():
    return pd.read_csv("data/trades.csv", parse_dates=["timestamp"])

def load_prices():
    return pd.read_csv("data/price_series.csv", parse_dates=["timestamp"])

def load_wallets():
    return pd.read_csv("data/wallet_summary.csv")