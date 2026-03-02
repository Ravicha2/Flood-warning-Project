"""
Router — POST /assistant/ask
Claude-based flood assistant: user message + optional location context → reply.
"""

import asyncio
import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.assistant import ask_claude

logger = logging.getLogger(__name__)
router = APIRouter()


class AssistantAskRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class AssistantAskResponse(BaseModel):
    reply: str


@router.post(
    "/ask",
    response_model=AssistantAskResponse,
    summary="Ask the flood assistant (Claude)",
)
async def assistant_ask(payload: AssistantAskRequest):
    """
    Send a message to the flood assistant. Optionally provide latitude/longitude
    so the assistant can use your current risk, nearest sensor, and boundaries as context.
    In critical mode (high/critical risk + in flood zone), the assistant replies with
    short, urgent steps.
    """
    context = None
    if payload.latitude is not None and payload.longitude is not None:
        try:
            from app.db.elasticsearch import get_es_client
            from app.routers.location import (
                _query_boundaries,
                _query_nearest_sensor,
                _query_predictions,
                _max_risk,
            )

            es = await get_es_client()
            lat, lon = payload.latitude, payload.longitude
            radius_km = 50.0
            boundaries_result, sensor_result, prediction_time = await asyncio.gather(
                _query_boundaries(es, lat, lon),
                _query_nearest_sensor(es, lat, lon, radius_km),
                _query_predictions(es, lat, lon, radius_km),
                return_exceptions=True,
            )
            active_boundaries: list[str] = []
            risk_from_boundaries = "low"
            if not isinstance(boundaries_result, Exception):
                active_boundaries, risk_from_boundaries = boundaries_result
            sensor_id: str | None = None
            water_level: float | None = None
            sensor_risk = "low"
            if not isinstance(sensor_result, Exception):
                sensor_id, water_level, sensor_risk = sensor_result
            final_risk = _max_risk(risk_from_boundaries, sensor_risk)
            if final_risk == "low":
                message = "No active flood risk detected at your location."
            elif final_risk == "medium":
                message = "Elevated flood risk detected. Monitor conditions closely."
            elif final_risk == "high":
                message = "High flood risk! Be prepared to evacuate."
            else:
                message = "CRITICAL flood risk! Evacuate immediately."
            context = {
                "risk_level": final_risk,
                "in_flood_zone": len(active_boundaries) > 0,
                "nearest_sensor_id": sensor_id,
                "water_level_m": water_level,
                "active_boundaries": active_boundaries,
                "message": message,
            }
        except Exception as e:
            logger.warning("Failed to build assistant context: %s", e)
            context = {"message": "Could not load location context."}

    reply = await ask_claude(payload.message, context)
    return AssistantAskResponse(reply=reply)
