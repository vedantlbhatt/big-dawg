def get_recommendation(integrity_res, info_res, conf_res):
    """
    Synthesizes signals from Integrity, Information, and Confidence engines.
    Returns: {
        "action": str,
        "color": str,
        "reasoning": str
    }
    """
    health_score = integrity_res["score"]
    info_type = info_res["classification"]
    confidence = conf_res["confidence_score"]
    prob = conf_res["probability"]
    
    # 1. High Manipulation Risk logic
    if "Manipulation" in integrity_res["status"]:
        return {
            "action": "INACTION",
            "color": "#ef4444", # Red
            "reasoning": "High manipulation risk detected (e.g., whale concentration or wash trading signals). The current signals are likely artificial and do not represent organic market sentiment."
        }
    
    # 2. Low Confidence logic
    if confidence < 0.3:
        return {
            "action": "WATCH",
            "color": "#f59e0b", # Amber
            "reasoning": "Confidence score is critically low due to extreme price volatility. Avoid large positions until the price settles and more organic volume enters the market."
        }

    # 3. Opportunity Scoring
    # If Informed Activity is detected and Integrity is Healthy
    if "Informed" in info_type and health_score > 0.6:
        if prob < 0.3:
            return {
                "action": "STRONG BUY",
                "color": "#10b981", # Green
                "reasoning": "High integrity environment with clear signals of informed accumulation. The price (prob) appears undervalued relative to the information flow detected by the engine."
            }
        elif prob > 0.7:
             return {
                "action": "TAKE PROFIT / SHORT",
                "color": "#3b82f6", # Blue
                "reasoning": "Price has reached a high probability threshold while informed activity remains dominant. Consider securing gains or looking for exhaustion signals."
            }
    
    # 4. Momentum / Retail logic
    if "Momentum" in info_type:
        return {
            "action": "RIDE MOMENTUM",
            "color": "#8b5cf6", # Purple
            "reasoning": "Organic retail momentum is driving the price. This is a higher risk but high reward zone. Track volume closely for signs of reversal."
        }

    # Default
    return {
        "action": "HOLD / NEUTRAL",
        "color": "#64748b", # Slate
        "reasoning": "The market is currently in a balanced state with no strong directional signals from manipulation or information engines. Monitoring for further developments is advised."
    }
