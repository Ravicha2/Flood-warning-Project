"""
Router — GET /predictions
Returns ML flood predictions for the next N hours.
"""

from fastapi import APIRouter, Depends, Query
from app.schemas import PredictionsResponse
from app.db.elasticsearch import get_es_client

router = APIRouter()


@router.get("/predictions", response_model=PredictionsResponse)
async def get_predictions(
    hours_ahead: int = Query(default=6, ge=1, le=24, description="Prediction window in hours"),
    lat: float | None = Query(default=None),
    lon: float | None = Query(default=None),
    radius_km: float = Query(default=50.0),
    es=Depends(get_es_client),
):
    """
    Return flood predictions for the next N hours.

    Steps to implement:
    1. Query flood-predictions-* for documents where predicted_for > now AND
       predicted_for <= now + hours_ahead
    2. Optionally filter by geo_distance if lat/lon provided
    3. Sort by predicted_for ASC, confidence_score DESC
    """
    # TODO: compute time range
    # TODO: build and execute Elasticsearch query
    # TODO: map hits to PredictionItem
    raise NotImplementedError("get_predictions is not yet implemented")
