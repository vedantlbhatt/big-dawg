import numpy as np
import pandas as pd


def early_entry_score(trades, price_series):
    """
    Measures whether trades (Buy/Sell) tend to occur before price moves in that direction.
    Higher score = specific trades are consistently "early" to a price shift.
    """
    if len(trades) < 10 or len(price_series) < 5:
        return 0

    trades = trades.sort_values("timestamp")
    # Get directional signal: BUY (+1), SELL (-1)
    trades['direction'] = trades['side'].map({'BUY': 1, 'SELL': -1}).fillna(0)
    
    # Map future returns to trades
    # We look at the price change ~30 mins (or next few price points) after each trade
    scores = []
    for _, trade in trades.sample(min(20, len(trades))).iterrows():
        # Price at trade time or nearest preceding
        current_p = trade['price']
        
        # Look at the price series after this trade's timestamp
        future_prices = price_series[price_series.index > trade['timestamp']].head(5)
        if future_prices.empty:
            continue
            
        future_p = future_prices.iloc[-1]
        price_change = (future_p - current_p) / (current_p or 1)
        
        # If trade direction matches price change sign, it's "informed"
        # We also scale by the magnitude of the move
        impact = trade['direction'] * price_change
        scores.append(impact)

    if not scores:
        return 0
        
    avg_impact = np.mean(scores)
    # Informed if they consistently catch positive moves after buying or neg after selling
    # Threshold: an avg 0.5% directional catch is very strong
    score = min(max(avg_impact * 100, 0), 1)
    
    return score
