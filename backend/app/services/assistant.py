"""
Flood assistant — calls Claude with user message and flood context (risk, boundaries, predictions).
Supports Amazon Bedrock (AWS credentials) or Anthropic API. No training; prompt-only.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


def build_system_prompt(is_critical: bool) -> str:
    if is_critical:
        return (
            "You are an emergency flood assistant. Risk is CRITICAL or HIGH. "
            "Reply in 3–6 short, numbered steps. Start with the single most important action. "
            "Use only the provided context. No preamble. Tone: direct, calm, urgent. "
            "Do not make up data; if context is missing, say so briefly."
        )
    return (
        "You are a flood safety assistant. Use only the provided context to answer. "
        "Be concise and actionable. If the user is in a flood zone, give clear steps. "
        "Do not make up sensor readings or locations; if context is missing, say so."
    )


def build_context_block(context: dict[str, Any] | None) -> str:
    if not context:
        return "No location or risk context provided."
    parts = []
    if "risk_level" in context:
        parts.append(f"Risk level: {context['risk_level']}")
    if "in_flood_zone" in context:
        parts.append(f"In active flood zone: {context['in_flood_zone']}")
    if "nearest_sensor_id" in context and context["nearest_sensor_id"]:
        parts.append(f"Nearest sensor: {context['nearest_sensor_id']}")
    if "water_level_m" in context and context["water_level_m"] is not None:
        parts.append(f"Water level (nearest): {context['water_level_m']} m")
    if "active_boundaries" in context and context["active_boundaries"]:
        parts.append(f"Active boundaries: {', '.join(context['active_boundaries'])}")
    if "message" in context and context["message"]:
        parts.append(f"Summary: {context['message']}")
    if "evacuation_waypoints_count" in context:
        parts.append(f"Evacuation route waypoints: {context['evacuation_waypoints_count']}")
    return "\n".join(parts) if parts else "No location or risk context provided."


def _ask_via_bedrock(message: str, context: dict[str, Any] | None) -> str:
    """
    Invoke Claude on Amazon Bedrock via boto3. Uses AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.
    """
    settings = get_settings()
    if not settings.aws_access_key_id or not settings.aws_secret_access_key:
        return "Assistant (Bedrock) is not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
    try:
        import boto3
    except ImportError:
        return "Assistant requires the boto3 package. Install with: pip install boto3"
    is_critical = (
        context
        and context.get("risk_level") in ("high", "critical")
        and context.get("in_flood_zone") is True
    )
    system = build_system_prompt(is_critical)
    context_block = build_context_block(context)
    user_content = f"Context:\n{context_block}\n\nUser question: {message}"
    model_id = getattr(settings, "assistant_bedrock_model_id", None) or "anthropic.claude-3-5-haiku-20241022-v1:0"
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 1024,
        "system": system,
        "messages": [{"role": "user", "content": user_content}],
    })
    try:
        client = boto3.client(
            "bedrock-runtime",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )
        response = client.invoke_model(
            modelId=model_id,
            contentType="application/json",
            body=body,
        )
        response_body = json.loads(response["body"].read())
        content = response_body.get("content", [])
        if not content or "text" not in content[0]:
            return "No reply from assistant."
        return content[0]["text"].strip()
    except Exception as e:
        logger.exception("Bedrock invoke_model failed")
        return f"Bedrock is not available. Check AWS credentials and that the model is enabled in Bedrock → Model access. Error: {e!s}"


async def ask_claude(message: str, context: dict[str, Any] | None) -> str:
    """
    Send user message and context to Claude; return assistant reply.
    Uses ASSISTANT_PROVIDER: "bedrock" (AWS credentials) or "anthropic" (ANTHROPIC_API_KEY).
    """
    settings = get_settings()
    provider = (getattr(settings, "assistant_provider", None) or "bedrock").strip().lower()
    if provider == "bedrock":
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            return _ask_via_bedrock(message, context)
        if settings.anthropic_api_key and settings.anthropic_api_key.strip():
            provider = "anthropic"
        else:
            return "Assistant is not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for Bedrock, or ANTHROPIC_API_KEY for Anthropic."
    if provider == "anthropic":
        if not getattr(settings, "anthropic_api_key", None) or not settings.anthropic_api_key.strip():
            return "Assistant is not configured. Set ANTHROPIC_API_KEY on the server."
        try:
            import anthropic
        except ImportError:
            return "Assistant requires the anthropic package. Install with: pip install anthropic"
        is_critical = (
            context
            and context.get("risk_level") in ("high", "critical")
            and context.get("in_flood_zone") is True
        )
        system = build_system_prompt(is_critical)
        context_block = build_context_block(context)
        user_content = f"Context:\n{context_block}\n\nUser question: {message}"
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key.strip())
        response = client.messages.create(
            model=getattr(settings, "assistant_model", "claude-3-5-haiku-20241022") or "claude-3-5-haiku-20241022",
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": user_content}],
        )
        if not response.content or not response.content[0].text:
            return "No reply from assistant."
        return response.content[0].text.strip()
    return "Assistant is not configured. Set ASSISTANT_PROVIDER=bedrock with AWS credentials, or ASSISTANT_PROVIDER=anthropic with ANTHROPIC_API_KEY."
