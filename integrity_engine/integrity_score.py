# integrity_engine/integrity_score.py

from .concentration import whale_concentration_score
from .price_impact import price_impact_score
from .liquidity_spikes import liquidity_spike_score
from .flip_detection import flip_frequency_score
from .clustering import timing_cluster_score

def integrity_score(wallet_summary, trades, price_series=None):
    """
    Returns:
    {
        "score": float,
        "status": str,
        "components": dict
    }
    """

    whale = whale_concentration_score(wallet_summary)
    impact = price_impact_score(trades)
    liquidity = liquidity_spike_score(trades)
    flips = flip_frequency_score(trades)
    clusters = timing_cluster_score(trades)

    weighted_risk = (
        0.4 * whale +
        0.2 * impact +
        0.15 * liquidity +
        0.15 * flips +
        0.1 * clusters
    )

    health_score = 1 - weighted_risk

    if health_score > 0.75:
        status = "🟢 Healthy"
    elif health_score > 0.5:
        status = "🟡 Volatile"
    else:
        status = "🔴 High Manipulation Risk"

    return {
        "score": round(health_score, 3),
        "status": status,
        "components": {
            "whale_risk": whale,
            "price_impact_risk": impact,
            "liquidity_risk": liquidity,
            "flip_risk": flips,
            "cluster_risk": clusters
        }
    }