import numpy as np


def momentum_score(price_series):
    """
    Detect "herd behavior" by measuring directional consistency.
    If 80% of recent moves are in the same direction, momentum is high.
    """
    if len(price_series) < 10:
        return 0

    # Calculate returns
    returns = price_series.diff().dropna()
    if returns.empty:
        return 0

    # Directional consistency: (Absolute sum of returns) / (Sum of absolute returns)
    # If all returns are positive (or negative), score is 1.0
    # If returns are choppy (up and down), score is near 0
    total_movement = returns.abs().sum()
    net_movement = abs(returns.sum())
    
    if total_movement == 0:
        return 0
        
    consistency = net_movement / total_movement
    
    # Scale consistency by volatility to ensure it's "meaningful" momentum
    volatility = returns.std()
    score = min(consistency * (volatility * 10), 1)

    return score
