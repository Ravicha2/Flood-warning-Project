"""
Router — GET /predictions/predictions
Returns ML flood predictions for the next N hours from Elasticsearch.

Mobile app uses this data for:
  - Predictions tab (list of upcoming flood events)
  - Map layer showing predicted flood points
"""

import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from app.schemas import PredictionsResponse, PredictionItem, RiskLevel
from app.db.elasticsearch import get_es_client
from elasticsearch import AsyncElasticsearch

logger = logging.getLogger(__name__)
router = APIRouter()

PREDICTIONS_INDEX = "flood-predictions-*"


@router.get(
    "/predictions",
    response_model=PredictionsResponse,
    summary="Get flood predictions for the next N hours",
)
async def get_predictions(
    hours_ahead: int = Query(
        default=6,
        ge=1,
        le=24,
        description="Prediction window in hours from now (1–24)"
    ),
    lat: float | None = Query(
        default=None,
        ge=-90, le=90,
        description="Latitude — when combined with lon, filter by geo_distance"
    ),
    lon: float | None = Query(
        default=None,
        ge=-180, le=180,
        description="Longitude — when combined with lat, filter by geo_distance"
    ),
    radius_km: float = Query(
        default=50.0,
        gt=0,
        description="Search radius in km when lat/lon provided"
    ),
    at_time: str | None = Query(
        default=None,
        description=(
            "ISO8601 datetime. When provided, the window starts here instead of 'now'. "
            "Example: 2024-01-15T06:00:00Z"
        ),
    ),
    es: AsyncElasticsearch = Depends(get_es_client),
):
    """
    Returns upcoming flood predictions from Elasticsearch.

    Query logic:
      - Range filter: predicted_for between start and start + hours_ahead
      - Optional: geo_distance filter if lat AND lon are both provided
      - Sort: predicted_for ASC, confidence_score DESC
    """
    # Determine time window
    try:
        start_dt = (
            datetime.fromisoformat(at_time.replace("Z", "+00:00"))
            if at_time
            else datetime.now(timezone.utc)
        )
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid at_time format: {at_time}")

    end_dt = start_dt + timedelta(hours=hours_ahead)

    # Build bool filters
    filters = [
        {
            "range": {
                "predicted_for": {
                    "gte": start_dt.isoformat(),
                    "lte": end_dt.isoformat(),
                }
            }
        }
    ]

    # Optional geo filter — only applied when both lat and lon are present
    if lat is not None and lon is not None:
        filters.append({
            "geo_distance": {
                "distance": f"{radius_km}km",
                "location": {"lat": lat, "lon": lon},
            }
        })

    sort = [
        {"predicted_for": {"order": "asc"}},
        {"confidence_score": {"order": "desc"}},
    ]

    try:
        result = await es.search(
            index=PREDICTIONS_INDEX,
            body={
                "query": {"bool": {"filter": filters}},
                "sort": sort,
                "size": 100,
            },
        )
    except Exception as exc:
        logger.error("ES predictions query failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Elasticsearch error: {exc}")

    hits = result["hits"]["hits"]
    total = result["hits"]["total"]["value"]

    predictions: list[PredictionItem] = []
    for hit in hits:
        src = hit["_source"]
        try:
            # location stored as {"lat": x, "lon": y} or [lon, lat] array
            loc = src.get("location", {})
            if isinstance(loc, dict):
                p_lat = loc.get("lat", 0.0)
                p_lon = loc.get("lon", 0.0)
            elif isinstance(loc, list) and len(loc) >= 2:
                p_lon, p_lat = loc[0], loc[1]  # GeoJSON order
            else:
                p_lat, p_lon = 0.0, 0.0

            predictions.append(
                PredictionItem(
                    prediction_id=src.get("prediction_id", hit["_id"]),
                    sensor_id=src.get("sensor_id", "unknown"),
                    latitude=p_lat,
                    longitude=p_lon,
                    predicted_water_level=float(src.get("predicted_water_level", 0.0)),
                    predicted_risk_level=RiskLevel(src.get("predicted_risk_level", "low")),
                    prediction_horizon_hours=int(src.get("prediction_horizon_hours", hours_ahead)),
                    confidence_score=float(src.get("confidence_score", 0.0)),
                    predicted_for=src.get("predicted_for", ""),
                )
            )
        except Exception as mapping_err:
            logger.warning("Skipping prediction doc %s: %s", hit["_id"], mapping_err)

    logger.info(
        "Returned %d/%d predictions (window=%dh from %s)",
        len(predictions), total, hours_ahead, start_dt.isoformat(),
    )
    return PredictionsResponse(total=total, predictions=predictions)
