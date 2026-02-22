# 🎯 Price Prediction Engine

This module implements a real-time **Cross-Sectional Linear Regression** model to identify "Alpha" signals across the Polymarket ecosystem.

## 🧠 The Model

The engine correlates behavioral features extracted from recent trade history with the **next 30-minute return** of a market. It trains dynamically on the top 12+ most active markets to find patterns that are consistent across the entire platform.

### Feature Engineering
1. **Whale Activity**: The percentage of total volume contributed by the top 5% of wallets. High concentration often leads to price moves.
2. **Order Imbalance**: The net buying pressure (Buy Vol - Sell Vol) normalized by total volume.
3. **Volatility**: The standard deviation of trade prices in the lead-up period.

### Regression Equation
The model solves for:
`next_return ~ β₁*(whale_activity) + β₂*(imbalance) + β₃*(volatility) + intercept`

## 📊 Interpreting Results

- **R² Score (Model Confidence)**: Indicates how much of the price movement is currently explained by these behavioral factors.
    - `> 0.30`: High predictability; signals are strong.
    - `< 0.10`: Low predictability; market is likely driven by external news or random noise.
- **Coefficients (β)**: The "Influence" of each feature.
    - **Positive Coefficient**: Higher values of this feature predict price increases.
    - **Negative Coefficient**: Higher values predict price decreases.

## 🛠 Integration
The model is served via the `/api/predictive_insights` endpoint and visualized on the main **Markets** dashboard to provide a "Macro-Signal" before diving into individual market analysis.
