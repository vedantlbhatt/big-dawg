from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

def train_price_model(features_df):
    X = features_df[[
        "whale_activity",
        "total_volume",
        "order_imbalance",
        "volatility"
    ]]

    y = features_df["next_return"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    model = LinearRegression()
    model.fit(X_train, y_train)

    r2 = model.score(X_test, y_test)

    return model, r2, dict(zip(X.columns, model.coef_))