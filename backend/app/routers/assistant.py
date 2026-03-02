"""
Router — POST /assistant/ask, GET /assistant/emergency-number
Claude-based flood assistant and emergency number by location.
"""

import asyncio
import logging
from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.services.assistant import ask_claude

logger = logging.getLogger(__name__)
router = APIRouter()

# Emergency numbers by ISO country code (fallback when not in a boundary).
# See https://en.wikipedia.org/wiki/List_of_emergency_telephone_numbers
EMERGENCY_BY_COUNTRY: dict[str, str] = {
    "AU": "000",   # Australia
    "ID": "112",   # Indonesia (unified)
    "TH": "199",   # Thailand (emergency)
    "MY": "999",   # Malaysia
    "US": "911",
    "GB": "999",
    "SG": "995",   # Singapore
    "PH": "911",   # Philippines
    "VN": "113",   # Vietnam (police)
    "IN": "112",   # India
}
DEFAULT_EMERGENCY = "112"  # International / EU style; works in many countries


class AssistantAskRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class AssistantAskResponse(BaseModel):
    reply: str
    suggest_emergency_call: bool = Field(
        default=False,
        description="True when risk at user location is high or critical; show Call emergency prominently.",
    )
    risk_level: str | None = Field(default=None, description="low, medium, high, or critical when location was sent.")


class EmergencyNumberResponse(BaseModel):
    number: str = Field(..., description="Dial string (e.g. 000, 112)")
    country: str | None = Field(None, description="ISO country code if known")
    label: str = Field(default="Emergency", description="Short label for UI")


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
                active_boundaries, risk_from_boundaries, _ = boundaries_result
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
    suggest = False
    level: str | None = None
    if context and context.get("risk_level") in ("high", "critical"):
        suggest = True
        level = context.get("risk_level")
    return AssistantAskResponse(reply=reply, suggest_emergency_call=suggest, risk_level=level)


def _country_from_rough_bounds(lat: float, lon: float) -> str | None:
    """Rough bounding boxes for areas we care about when no boundary hit."""
    # Australia
    if -44 <= lat <= -10 and 113 <= lon <= 154:
        return "AU"
    # Indonesia (main islands)
    if -6 <= lat <= 6 and 95 <= lon <= 141:
        return "ID"
    # Thailand
    if 5.5 <= lat <= 21 and 97 <= lon <= 106:
        return "TH"
    # Malaysia
    if 1 <= lat <= 7 and 100 <= lon <= 120:
        return "MY"
    return None


@router.get(
    "/emergency-number",
    response_model=EmergencyNumberResponse,
    summary="Get emergency dial number for a location",
)
async def get_emergency_number(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    """
    Returns the emergency phone number for the given coordinates so the app
    can open the dialer with one tap. Uses flood boundaries (country from
    overlapping zone) or rough regional bounds, then a static map.
    """
    country: str | None = None
    try:
        from app.db.elasticsearch import get_es_client
        from app.routers.location import _query_boundaries

        es = await get_es_client()
        _, _, country = await _query_boundaries(es, latitude, longitude)
    except Exception as e:
        logger.warning("Emergency number: could not get country from boundaries: %s", e)
    if not country:
        country = _country_from_rough_bounds(latitude, longitude)
    number = (EMERGENCY_BY_COUNTRY.get(country) if country else None) or DEFAULT_EMERGENCY
    label = "Emergency" if not country else f"Emergency ({country})"
    return EmergencyNumberResponse(number=number, country=country, label=label)


# Expose for OpenAPI
__all__ = ["router", "AssistantAskRequest", "AssistantAskResponse", "EmergencyNumberResponse"]
