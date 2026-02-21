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
    informed_score = early
    retail_score = momentum + reaction
    whale_score = whale

    # Normalize retail
    retail_score = min(retail_score / 2, 1)

    # Classify
    if informed_score > retail_score and informed_score > whale_score:
        classification = "🧠 Likely Informed Activity"
    elif whale_score > informed_score and whale_score > retail_score:
        classification = "🎭 Whale Dominance"
    else:
        classification = "📈 Retail Momentum"

    return {
        "classification": classification,
        "components": {
            "informed_score": round(informed_score, 3),
            "retail_score": round(retail_score, 3),
            "whale_score": round(whale_score, 3)
        }
    }
