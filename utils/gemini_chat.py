"""
Intelligence Chat using Gemini (2.5 Flash by default).
Set GEMINI_API_KEY in your environment (or .env); do not commit the key.
"""
import os
import json

# Use a current model: gemini-1.5-flash was deprecated. 2.5 Flash is the current fast option.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

def _get_client():
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError("Install: pip install google-generativeai")
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    genai.configure(api_key=key)
    return genai.GenerativeModel(GEMINI_MODEL)


def build_stats_context(integrity_res, info_res, conf_res):
    """All dashboard statistics we use, as a single dict for the model."""
    return {
        "integrity": {
            "score": integrity_res.get("score"),
            "status": integrity_res.get("status"),
            "components": integrity_res.get("components", {}),
        },
        "information": {
            "classification": info_res.get("classification"),
            "components": info_res.get("components", {}),
        },
        "confidence": {
            "probability": conf_res.get("probability"),
            "disagreement_std": conf_res.get("disagreement_std"),
            "disagreement": conf_res.get("disagreement"),
            "confidence_score": conf_res.get("confidence_score"),
            "data_quality": conf_res.get("data_quality"),
            "confidence_level": conf_res.get("confidence_level"),
            "conviction_score": conf_res.get("conviction_score"),
        },
    }


def chat_with_stats(integrity_res, info_res, conf_res, user_message, history=None):
    """
    Send user message to Gemini 1.5 Flash with full dashboard stats as context.
    history: list of {"role": "user"|"assistant", "content": "..."}
    Returns the assistant's text response.
    """
    stats = build_stats_context(integrity_res, info_res, conf_res)
    stats_text = json.dumps(stats, indent=2)

    system = f"""You are an expert analyst for a prediction market intelligence dashboard (SignalLayer). You have access to the following live statistics for the current market. Use them to answer the user's questions concisely and accurately.

## Dashboard statistics (JSON)
{stats_text}

## Metric meanings
- **integrity**: Market health (score 0–1). status: Healthy / Volatile / High Manipulation Risk. components: whale_risk, price_impact_risk, liquidity_risk, flip_risk, cluster_risk.
- **information**: Who is driving price. classification: Informed Activity / Retail Momentum / Whale Dominance. components: informed_score, retail_score, whale_score.
- **confidence**: How reliable the market probability is. probability = current implied probability; disagreement = spread of trader beliefs (Low/Medium/High); confidence_score/data_quality = stability (0–1); confidence_level = Low/Medium/High; conviction_score = size×time conviction (0–1).

Answer based on these stats. Be brief and actionable."""

    try:
        model = _get_client()
    except Exception as e:
        return f"Configuration error: {e}"

    # Build messages for Gemini (user/model alternation)
    parts = [system + "\n\n---\n\n"]
    if history:
        for m in history[-10:]:  # last 10 for context
            role = "user" if m.get("role") == "human" else "model"
            parts.append(f"{role}: {m.get('content', '')}\n")
    parts.append(f"user: {user_message}\n")
    prompt = "\n".join(parts)

    try:
        response = model.generate_content(prompt)
        return response.text if response and response.text else "No response."
    except Exception as e:
        if "404" not in str(e):
            return f"API error: {e}"
    # Fallback if default model not found (e.g. region or API version)
    import google.generativeai as genai
    for fallback in ["gemini-2.0-flash", "gemini-pro"]:
        try:
            model = genai.GenerativeModel(fallback)
            response = model.generate_content(prompt)
            return response.text if response and response.text else "No response."
        except Exception:
            continue
    return "API error: No working model found. Try setting GEMINI_MODEL (e.g. gemini-2.5-flash or gemini-2.0-flash)."
