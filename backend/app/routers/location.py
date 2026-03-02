"""
Router — POST /location/check-location
Accepts a lat/lon from the mobile app and returns a flood risk assessment.

Query strategy (all run against Elasticsearch):
  1. geo_shape intersect  → which active flood boundaries contain this point?
  2. geo_distance         → what is the nearest sensor and its reading?
  3. geo_distance + range → are there any predictions for this location in the next 6 h?

Risk priority: boundary-overlap risk > sensor risk_level > "low"
"""

import logging
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from app.schemas import LocationCheckRequest, LocationCheckResponse, RiskLevel
from app.db.elasticsearch import get_es_client
from elasticsearch import AsyncElasticsearch

logger = logging.getLogger(__name__)
router = APIRouter()

# ----- Risk level ordering (higher index = higher severity) ----------------
RISK_ORDER = ["low", "medium", "high", "critical"]


def _max_risk(*levels: str | None) -> str:
    """Return the highest severity risk level from a set of optional strings."""
    best = "low"
    for lvl in levels:
        if lvl and lvl in RISK_ORDER:
            if RISK_ORDER.index(lvl) > RISK_ORDER.index(best):
                best = lvl
    return best


# ---------------------------------------------------------------------------
async def _query_boundaries(es: AsyncElasticsearch, lat: float, lon: float) -> tuple[list[str], str, str | None]:
    """
    Geo-shape intersect query: find all active flood boundaries that contain
    the given point.

    Returns:
        (list_of_boundary_ids_or_names, highest_risk_level_from_boundaries, country_from_first_hit_or_none)
    """
    query = {
        "bool": {
            "filter": [
                {"term": {"active": True}},
                {
                    "geo_shape": {
                        "grid_cell": {
                            "shape": {
                                "type": "Point",
                                "coordinates": [lon, lat],  # GeoJSON: [lon, lat]
                            },
                            "relation": "intersects",
                        }
                    }
                },
            ]
        }
    }
    result = await es.search(index="flood-discharge-*", body={"query": query, "size": 20})
    hits = result["hits"]["hits"]

    boundary_ids: list[str] = []
    risk_from_boundaries = "low"
    first_country: str | None = None
    for hit in hits:
        src = hit["_source"]
        region = src.get("region", hit["_id"])
        if isinstance(region, str):
            region = region.replace("_", " ").title()
        boundary_ids.append(region)
        risk_from_boundaries = _max_risk(risk_from_boundaries, src.get("risk_level"))
        if first_country is None and src.get("country"):
            first_country = (src.get("country") or "").strip().upper() or None

    return boundary_ids, risk_from_boundaries, first_country


async def _query_nearest_sensor(
    es: AsyncElasticsearch, lat: float, lon: float, radius_km: float
) -> tuple[str | None, float | None, str]:
    """
    Geo-distance query: find the nearest sensor within radius_km.

    Returns:
        (sensor_id, water_level_m, risk_level)
    """
    query = {
        "bool": {
            "filter": [
                {
                    "geo_distance": {
                        "distance": f"{radius_km}km",
                        "location": {"lat": lat, "lon": lon},
                    }
                }
            ]
        }
    }
    sort = [
        {"_geo_distance": {"location": {"lat": lat, "lon": lon}, "order": "asc", "unit": "km"}}
    ]
    result = await es.search(
        index="flood-discharge-*",
        body={"query": query, "sort": sort, "size": 1},
    )
    hits = result["hits"]["hits"]
    if not hits:
        return None, None, "low"

    src = hits[0]["_source"]
    return (
        src.get("region", "unknown_region").replace("_", " ").title() + " Grid",
        float(src.get("river_discharge_m3s", 0.0)),
        src.get("risk_level", "low"),
    )


async def _query_predictions(
    es: AsyncElasticsearch, lat: float, lon: float, radius_km: float, at_time: str | None = None
) -> str | None:
    """
    Geo-distance + time-range query: find the nearest prediction for this
    location in the next 6 hours.

    Returns:
        ISO8601 string of earliest predicted flood time, or None.
    """
    if at_time:
        now = datetime.fromisoformat(at_time.replace("Z", "+00:00"))
    else:
        now = datetime.now(timezone.utc)
    in_6h = now + timedelta(hours=6)

    query = {
        "bool": {
            "filter": [
                {
                    "geo_distance": {
                        "distance": f"{radius_km}km",
                        "location": {"lat": lat, "lon": lon},
                    }
                },
                {
                    "range": {
                        "predicted_for": {
                            "gte": now.isoformat(),
                            "lte": in_6h.isoformat(),
                        }
                    }
                },
            ]
        }
    }
    sort = [
        {"predicted_for": {"order": "asc"}},
        {"confidence_score": {"order": "desc"}},
    ]
    result = await es.search(
        index="flood-predictions-*",
        body={"query": query, "sort": sort, "size": 1},
    )
    hits = result["hits"]["hits"]
    if not hits:
        return None
    return hits[0]["_source"].get("predicted_for")


# ---------------------------------------------------------------------------
@router.post(
    "/check-location",
    response_model=LocationCheckResponse,
    summary="Check flood risk for a GPS coordinate",
)
async def check_location(
    payload: LocationCheckRequest,
    es: AsyncElasticsearch = Depends(get_es_client),
):
    """
    Mobile 'Check Risk' button — send device lat/lon, receive:
      - risk_level       : low | medium | high | critical
      - nearest_sensor_id
      - water_level_m
      - active_boundaries: list of IDs/names of overlapping flood zones
      - predicted_flood_time: earliest prediction ≤ 6 h out (if any)
    """
    lat = payload.latitude
    lon = payload.longitude
    radius_km = payload.radius_km

    try:
        # Run all three queries concurrently to keep latency low
        boundaries_result, sensor_result, prediction_time = await asyncio.gather(
            _query_boundaries(es, lat, lon),
            _query_nearest_sensor(es, lat, lon, radius_km),
            _query_predictions(es, lat, lon, radius_km, payload.at_time),
            return_exceptions=True,
        )
    except Exception as exc:
        logger.error("check_location ES queries failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Elasticsearch error: {exc}")

    # Handle partial failures gracefully
    active_boundaries: list[str] = []
    risk_from_boundaries = "low"
    if not isinstance(boundaries_result, Exception):
        active_boundaries, risk_from_boundaries, _ = boundaries_result

    sensor_id: str | None = None
    water_level: float | None = None
    sensor_risk = "low"
    if not isinstance(sensor_result, Exception):
        sensor_id, water_level, sensor_risk = sensor_result

    predicted_time: str | None = None
    if not isinstance(prediction_time, Exception):
        predicted_time = prediction_time

    # Final risk: boundary overlap takes precedence over sensor reading
    final_risk = _max_risk(risk_from_boundaries, sensor_risk)

    # Build human-readable message
    if final_risk == "low":
        message = "No active flood risk detected at your location."
    elif final_risk == "medium":
        message = "Elevated flood risk detected. Monitor conditions closely."
    elif final_risk == "high":
        message = "High flood risk! Be prepared to evacuate."
    else:
        message = "CRITICAL flood risk! Evacuate immediately."

    logger.info(
        "check_location lat=%.4f lon=%.4f → risk=%s boundaries=%d sensor=%s",
        lat, lon, final_risk, len(active_boundaries), sensor_id,
    )

    return LocationCheckResponse(
        latitude=lat,
        longitude=lon,
        risk_level=RiskLevel(final_risk),
        nearest_sensor_id=sensor_id,
        water_level_m=water_level,
        predicted_flood_time=predicted_time,
        active_boundaries=active_boundaries,
        message=message,
    )
