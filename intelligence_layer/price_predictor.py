import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

def prepare_prediction_features(trades_df, interval_mins=30):
    """
    Extracts features for a single market to be used in cross-sectional regression.
    We look at the stats leading up to the last 30 mins, and the return of the last 30 mins.
    """
    if trades_df.empty or len(trades_df) < 10:
        return None
        
    df = trades_df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    cutoff = df['timestamp'].max() - pd.Timedelta(minutes=interval_mins)
    
    # Pre-cutoff trades (Features)
    feature_trades = df[df['timestamp'] < cutoff]
    # Post-cutoff trades (Target)
    target_trades = df[df['timestamp'] >= cutoff]
    
    if feature_trades.empty or target_trades.empty:
        return None
        
    # Feature 1: Whale Activity (Vol share of top 5% of wallets)
    wallet_vols = feature_trades.groupby('wallet')['size'].sum().sort_values(ascending=False)
    top_n = max(1, int(len(wallet_vols) * 0.05))
    whale_vol = wallet_vols.head(top_n).sum()
    total_vol = feature_trades['size'].sum()
    whale_activity = whale_vol / total_vol if total_vol > 0 else 0
    
    # Feature 2: Order Imbalance (Net Buy Vol / Total Vol)
    # Side is BUY/SELL from Gamma, but we should use normalized side if possible
    # For now, let's assume 'side' is normalized or use it as a proxy
    buys = feature_trades[feature_trades['side'] == 'BUY']['size'].sum()
    sells = feature_trades[feature_trades['side'] == 'SELL']['size'].sum()
    imbalance = (buys - sells) / total_vol if total_vol > 0 else 0
    
    # Feature 3: Volatility
    volatility = feature_trades['price'].std() if len(feature_trades) > 1 else 0
    
    # Target: Return in post-cutoff window
    start_price = feature_trades['price'].iloc[-1]
    end_price = target_trades['price'].iloc[-1]
    next_return = (end_price - start_price) / start_price if start_price > 0 else 0
    
    return {
        "whale_activity": whale_activity,
        "order_imbalance": imbalance,
        "volatility": volatility,
        "next_return": next_return
    }

def train_alpha_model(market_data_list):
    """
    Trains a linear regression model on a list of feature dicts from multiple markets.
    """
    df = pd.DataFrame([m for m in market_data_list if m is not None])
    
    if len(df) < 5:
        return {"error": "Insufficient data points to train model"}
        
    X = df[["whale_activity", "order_imbalance", "volatility"]]
    y = df["next_return"]
    
    # For live dashboard, we might not split if data is small, but let's do it for integrity
    try:
        if len(df) > 10:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        else:
            X_train, X_test, y_train, y_test = X, X, y, y
            
        model = LinearRegression()
        model.fit(X_train, y_train)
        
        preds = model.predict(X_test)
        r2 = r2_score(y_test, preds)
        
        coefficients = {
            feature: float(coef) 
            for feature, coef in zip(X.columns, model.coef_)
        }
        
        return {
            "r2": float(r2),
            "coefficients": coefficients,
            "sample_size": len(df),
            "intercept": float(model.intercept_)
        }
    except Exception as e:
        return {"error": str(e)}
