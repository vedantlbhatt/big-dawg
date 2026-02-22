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


def build_stats_context(integrity_res, info_res, conf_res, extra_context=None):
    """All dashboard statistics we use, as a single dict for the model."""
    context = {
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
    if extra_context:
        context["market"] = {
            "market_name": extra_context.get("market_name"),
            "master_res": extra_context.get("master_res"),
            "recommendation": extra_context.get("recommendation"),
            "trades_count": extra_context.get("trades_count"),
            "current_price": extra_context.get("current_price"),
            "yes_vol": extra_context.get("yes_vol"),
            "no_vol": extra_context.get("no_vol"),
        }
        context["wallet_intel"] = extra_context.get("wallet_intel")
        context["price_series_tail"] = extra_context.get("price_series_tail", [])
        context["recent_trades"] = extra_context.get("recent_trades", [])
    return context


def chat_with_stats(integrity_res, info_res, conf_res, user_message, history=None, extra_context=None, initial=False):
    """
    Send user message to Gemini 1.5 Flash with full dashboard stats as context.
    history: list of {"role": "user"|"assistant", "content": "..."}
    Returns the assistant's text response.
    """
    stats = build_stats_context(integrity_res, info_res, conf_res, extra_context=extra_context)

    if initial:
        initial_stats = {
            "wallet_intel": stats.get("wallet_intel"),
            "market": {
                "market_name": (stats.get("market") or {}).get("market_name")
            },
        }
        stats_text = json.dumps(initial_stats, indent=2)
        system = f"""You are an expert analyst for a prediction market intelligence dashboard (SignalLayer).

## Dashboard statistics (JSON)
{stats_text}

## Initial bearing rules (STRICT)
- Treat the Wallet Intel tab as the primary source for this initial bearing.
- Use ONLY wallet_intel (lean, leanPct, divergence, and top-wallet stance) for this initial bearing.
- Do NOT use integrity/information/confidence metrics for the initial bearing.
- If wallet_intel is missing or empty, state that wallet context is insufficient.
- Keep output to 2-3 short sentences, plain language.
- Include: (1) wallet lean + what top wallets are doing, (2) how divergence changes conviction, (3) one brief action + one brief uncertainty caveat.
- Never present predictions as guaranteed outcomes.
"""
        user_message = (
            "Provide a short initial AI recommendation using the Wallet Intel tab data only (smart wallet behavior + divergence). "
            "Use 2-3 sentences: first sentence explains lean/top-wallet behavior, second explains divergence impact and action, third gives a brief caveat if needed."
        )
    else:
        stats_text = json.dumps(stats, indent=2)

        system = f"""You are an expert analyst for a prediction market intelligence dashboard (SignalLayer). You have access to live market statistics.

## Dashboard statistics (JSON)
{stats_text}

## Metric meanings
- **integrity**: Market health (score 0–1). status: Healthy / Volatile / High Manipulation Risk. components: whale_risk, price_impact_risk, liquidity_risk, flip_risk, cluster_risk.
- **information**: Who is driving price. classification: Informed Activity / Retail Momentum / Whale Dominance. components: informed_score, retail_score, whale_score.
- **confidence**: How reliable the market probability is. probability = current implied probability; disagreement = spread of trader beliefs (Low/Medium/High); confidence_score/data_quality = stability (0–1); confidence_level = Low/Medium/High; conviction_score = size×time conviction (0–1).
- **wallet_intel**: Smart-wallet lean, lean percentage, divergence, and top-wallet positioning.

## Behavioral rules
- Start from Wallet Intel tab signals first (lean, leanPct, divergence, and top-wallet stance), then incorporate integrity/information/confidence.
- Use all provided data for user questions and give meaningful, actionable recommendations.
- Explicitly account for potential model error: include one short uncertainty caveat and what could invalidate the conclusion.
- Never present predictions as guaranteed outcomes.
"""

    try:
        model = _get_client()
    except Exception as e:
        return f"Configuration error: {e}"

    # Build messages for Gemini (user/model alternation)
    parts = [system + "\n\n---\n\n"]
    if history:
        for m in history[-14:]:  # last 14 for richer context
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
