import streamlit as st
import pandas as pd
import os
import altair as alt
from utils.fetch_data import fetch_trades, fetch_user_trades, fetch_user_positions, fetch_user_activity
from utils.data_loader import load_wallets, init_scout_db, get_wallet_analysis
from utils.market_loader import fetch_active_event_map
from utils.logic_engine import master_logic_engine

st.set_page_config(page_title="Event Intelligence | SignalLayer", layout="wide")

# Ensure DB is initialized
init_scout_db()

# -----------------------------
# CSS Styling (Shared)
# -----------------------------
if os.path.exists("style.css"):
    with open("style.css") as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

st.title("🕵️‍♂️ Wallet Intelligence: Event View")
st.markdown("### Analyzing 'Star' Sentiment with Master Logic Engine")

# -----------------------------
# LOGIC: LIVE EVENT DATA
# -----------------------------
@st.cache_data(ttl=600) # Cache live event map for 10 mins
def get_live_events():
    return fetch_active_event_map(limit=100)

event_map = get_live_events()

# -----------------------------
# LOGIC: ON-DEMAND SENTIMENT
# -----------------------------
@st.cache_data(ttl=300) # Cache analysis for 5 mins
def analyze_event_sentiment(event_title, slugs):
    if not slugs:
        return pd.DataFrame()
    
    event_data = []
    
    with st.status(f"Analyzing {len(slugs)} markets in {event_title}...", expanded=False) as status:
        for slug in slugs:
            st.write(f"Processing {slug}...")
            # 1. Fetch trades (2000 for parity/accuracy)
            trades_df = fetch_trades(slug, max_trades=2000)
            if trades_df.empty:
                continue
                
            # 2. Extract price series for engines
            price_series = trades_df.set_index("timestamp")["price"].resample("5min").last().ffill()
            
            # 3. Call Master Logic Engine
            # This handles wallet analysis, integrity, and information in one go
            master_res = master_logic_engine(trades_df, price_series)
            
            # Aggregate star sentiment values
            # (In a real scenario, we might want to sum cost_basis for YES vs NO)
            # The master_res contains details about stars.
            
            # Re-fetch wallet results specifically for sentiment split
            wallets = get_wallet_analysis(trades_df)
            stars = wallets[(wallets["roi"] >= 0.15) & (wallets["cost_basis"] > 10)]
            yes_val = stars[stars["net_position"] > 0]["cost_basis"].sum()
            no_val = stars[stars["net_position"] < 0]["cost_basis"].sum()
            
            event_data.append({
                "slug": slug,
                "YES": float(yes_val),
                "NO": float(no_val),
                "score": master_res["overall_score"],
                "verdict": master_res["verdict"]
            })
        status.update(label="Event Analysis Complete", state="complete")
        
    return pd.DataFrame(event_data)

# -----------------------------
# 1. EVENT SELECTION & SENTIMENT GRAPH
# -----------------------------
if not event_map:
    st.error("Could not fetch active events from Polymarket. Check your connection or API status.")
    st.stop()

event_options = sorted(list(event_map.keys()))
selected_event = st.selectbox("Select an Active Event to Analyze:", options=event_options)

if selected_event:
    sentiment_data = analyze_event_sentiment(selected_event, event_map[selected_event])
    
    if not sentiment_data.empty:
        st.subheader(f"📊 Live Signal Table: {selected_event}")
        
        # Display as a table with the overall score first
        display_res = sentiment_data[["slug", "score", "verdict", "YES", "NO"]].copy()
        display_res["score"] = display_res["score"].apply(lambda x: f"{int(x*100)}%")
        st.dataframe(display_res, use_container_width=True, hide_index=True)
        
        st.write("#### Sentiment Visualization")
        # Reshape for Altair
        plot_df = sentiment_data.melt(id_vars=["slug"], value_vars=["YES", "NO"], 
                                     var_name="Position", value_name="Capital Value")
        
        chart = alt.Chart(plot_df).mark_bar().encode(
            y=alt.Y("slug:N", title="Market Slug", sort="-x"),
            x=alt.X("Capital Value:Q", title="Aggregate Star Value ($)"),
            color=alt.Color("Position:N", scale=alt.Scale(domain=['YES', 'NO'], range=['#10b981', '#ef4444'])),
            tooltip=["slug", "Position", "Capital Value"]
        ).properties(height=max(200, len(sentiment_data) * 40))
        
        st.altair_chart(chart, use_container_width=True)
    else:
        st.info("No detailed sentiment data found for this event yet.")

# -----------------------------
# 2. STAR LEADERBOARD & DEEP-DIVE
# -----------------------------
st.write("---")
tab1, tab2 = st.tabs(["🏆 Current Slug Stars", "🔍 Global Wallet Search"])

with tab1:
    st.subheader("Stars on Active Dashboard Market")
    wallets_df = load_wallets()
    if not wallets_df.empty:
        # Re-calc ROI for consistency
        wallets_df["cost_basis"] = wallets_df["net_position"].abs() * wallets_df["avg_entry_price"]
        wallets_df["roi"] = (wallets_df["profit_estimate"] / wallets_df["cost_basis"]).fillna(0)
        
        stars = wallets_df[(wallets_df["roi"] >= 0.15) & (wallets_df["cost_basis"] > 10)].copy()
        stars = stars.sort_values("roi", ascending=False)
        
        if not stars.empty:
            display_stars = stars[["wallet", "profit_estimate", "roi", "net_position"]].copy()
            display_stars["roi"] = display_stars["roi"].apply(lambda x: f"{x*100:,.1f}%")
            display_stars["profit_estimate"] = display_stars["profit_estimate"].apply(lambda x: f"${x:,.2f}")
            
            st.dataframe(display_stars, use_container_width=True, hide_index=True)
            
            selected_star = st.selectbox("Deep-Dive into a Star's Portfolio:", options=["None"] + stars["wallet"].tolist())
            if selected_star != "None":
                st.write(f"#### 🔎 Full Profile: {selected_star}")
                try:
                    positions = fetch_user_positions(selected_star)
                    trades = fetch_user_trades(selected_star)
                    
                    c1, c2 = st.columns(2)
                    with c1:
                        st.write("📍 **Active Positions**")
                        st.dataframe(positions, use_container_width=True, hide_index=True)
                    with c2:
                        st.write("📜 **Global History**")
                        st.dataframe(trades.head(30), use_container_width=True, hide_index=True)
                except Exception as e:
                    st.error(f"Error fetching detail: {e}")
        else:
            st.info("No 15%+ ROI stars found on the current slug.")
    else:
        st.warning("No market analyzed in dashboard yet.")

with tab2:
    st.subheader("Search Any Wallet")
    manual_address = st.text_input("Enter Wallet Address (0x...)", "")
    if manual_address:
        try:
            act = fetch_user_activity(manual_address)
            st.json(act[:10])
        except Exception as e:
            st.error(f"Error: {e}")
