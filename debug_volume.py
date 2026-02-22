
import pandas as pd
import requests
from utils.fetch_data import fetch_trades, calculate_volume_split

def debug_market(slug):
    print(f"\n--- Debugging Market: {slug} ---")
    df = fetch_trades(slug, max_trades=50)
    if df.empty:
        print("No trades found.")
        return
    
    # Get Gamma info to see what yes_label would be
    gamma_url = f"https://gamma-api.polymarket.com/markets?slug={slug}"
    res = requests.get(gamma_url)
    data = res.json()
    yes_label = "YES"
    if data and isinstance(data, list):
        outcomes_raw = data[0].get("outcomes")
        if outcomes_raw:
            import json
            outcomes = json.loads(outcomes_raw)
            yes_label = outcomes[0]
            print(f"Gamma Outcomes: {outcomes}")

    print(f"Resolving with yes_label: {yes_label}")
    print("Unique raw outcomes in trades:")
    print(df['outcome'].unique())
    
    yes_vol, no_vol = calculate_volume_split(df, yes_label=yes_label)
    print(f"Calculated Yes Vol: {yes_vol}")
    print(f"Calculated No Vol: {no_vol}")
    
    total = yes_vol + no_vol
    if total > 0:
        print(f"Yes Ratio: {yes_vol/total*100:.2f}%")
        print(f"No Ratio: {no_vol/total*100:.2f}%")
    else:
        print("Total volume is 0.")

if __name__ == "__main__":
    markets = [
        "will-bitcoin-hit-100k-in-2024",
        "will-the-house-pass-a-israel-ukraine-aid-bill",
        "super-bowl-lviii-winner"
    ]
    for m in markets:
        try:
            debug_market(m)
        except Exception as e:
            print(f"Error debugging {m}: {e}")
