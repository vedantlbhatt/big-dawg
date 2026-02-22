
import pandas as pd
import requests
from utils.fetch_data import fetch_trades, calculate_volume_split

def debug_weinstein():
    slug = "will-harvey-weinstein-be-sentenced-to-between-20-and-30-years-in-prison"
    print(f"--- Debugging Market: {slug} ---")
    
    # Check Gamma
    gamma_url = f"https://gamma-api.polymarket.com/markets?slug={slug}"
    res = requests.get(gamma_url)
    data = res.json()
    yes_label = "YES"
    no_label = "NO"
    current_price = 0.5
    if data and isinstance(data, list):
        m = data[0]
        outcomes_raw = m.get("outcomes")
        if outcomes_raw:
            import json
            outcomes = json.loads(outcomes_raw)
            yes_label = outcomes[0]
            no_label = outcomes[1] if len(outcomes) > 1 else "NO"
        
        prices_raw = m.get("outcomePrices")
        if prices_raw:
            import json
            prices = json.loads(prices_raw)
            current_price = float(prices[0]) if prices else 0.5
            print(f"Gamma Outcome Prices: {prices}")

    print(f"Gamma Labels: YES={yes_label}, NO={no_label}")
    print(f"Gamma Current Price (YES): {current_price}")
    
    # Check Trades
    df = fetch_trades(slug, max_trades=100)
    if df.empty:
        print("No trades found.")
        return
    
    print("\nUnique raw outcomes in trades:")
    print(df['outcome'].unique())
    print("\nSample trades:")
    print(df[['timestamp', 'size', 'price', 'outcome', 'side']].tail(10))
    
    yes_vol, no_vol = calculate_volume_split(df, yes_label=yes_label, no_label=no_label)
    print(f"\nCalculated Yes Vol: {yes_vol}")
    print(f"Calculated No Vol: {no_vol}")
    
    total = yes_vol + no_vol
    if total > 0:
        print(f"Volume Yes Ratio: {yes_vol/total*100:.2f}%")
        print(f"Volume No Ratio: {no_vol/total*100:.2f}%")
    
    last_trade_price = df['price'].iloc[-1]
    print(f"\nLast Trade Price: {last_trade_price}")

if __name__ == "__main__":
    debug_weinstein()
