
import pandas as pd
from utils.market_loader import fetch_markets
from utils.fetch_data import fetch_trades

def inspect_active_markets():
    markets = fetch_markets(limit=20)
    for _, m in markets.iterrows():
        print(f"\nMarket: {m['question']}")
        print(f"Slug: {m['slug']}")
        print(f"Labels: YES={m.get('yes_label')}, NO={m.get('no_label')}")
        
        df = fetch_trades(m['slug'], max_trades=10)
        if not df.empty:
            print("Trade outcomes sample:")
            print(df['outcome'].unique())
        else:
            print("No trades found.")

if __name__ == "__main__":
    inspect_active_markets()
