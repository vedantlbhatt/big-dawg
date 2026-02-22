from .early_entry import early_entry_score
from .momentum import momentum_score
from .whale_behavior import whale_dominance_score
from .reaction_latency import reaction_latency_score


def classify_market_behavior(trades, price_series, wallet_summary=None):
    """
    Classifies market behavior as informed, retail momentum, or whale-dominated.
    
    Returns:
    {
        "classification": str,
        "components": dict
    }
    """

    early = early_entry_score(trades, price_series)
    momentum = momentum_score(price_series)
    reaction = reaction_latency_score(trades)

    whale = 0
    if wallet_summary is not None:
        whale = whale_dominance_score(wallet_summary)

    # Weighted logic
    # We increase the threshold for "Informed" to avoid over-reporting
    informed_score = early
    retail_score = min((momentum + reaction) / 2, 1)
    whale_score = whale

    # Classify with minimum thresholds so weak signals don't over-label markets
    informed_threshold = 0.6
    whale_threshold = 0.6
    retail_threshold = 0.5

    if (
        informed_score > retail_score
        and informed_score > whale_score
        and informed_score >= informed_threshold
    ):
        classification = "🧠 Likely Informed Activity"
    elif (
        whale_score > informed_score
        and whale_score > retail_score
        and whale_score >= whale_threshold
    ):
        classification = "🎭 Whale Dominance"
    elif retail_score >= retail_threshold:
        classification = "📈 Retail Momentum"
    else:
        classification = "🔎 Mixed / Noise"

    return {
        "classification": classification,
        "components": {
            "informed_score": round(float(informed_score), 3),
            "retail_score": round(float(retail_score), 3),
            "whale_score": round(float(whale_score), 3)
        }
    }
