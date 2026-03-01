"""
Router — POST /check-location
Accepts lat/lon and returns flood risk assessment for that point.
"""

from fastapi import APIRouter, Depends
from app.schemas import LocationCheckRequest, LocationCheckResponse
from app.db.elasticsearch import get_es_client

router = APIRouter()


@router.post("/check-location", response_model=LocationCheckResponse)
async def check_location(
    payload: LocationCheckRequest,
    es=Depends(get_es_client),
):
    """
    Check flood risk for a specific coordinate.

    Steps to implement:
    1. Query flood-boundaries-* with geo_shape intersect to find active boundaries
    2. Query flood-sensors-* with geo_distance to find nearest sensor
    3. Query flood-predictions-* for forecast at this location
    4. Combine results into a RiskLevel assessment
    5. (Optional) Call evacuation router to compute safe route
    """
    # TODO: implement Elasticsearch geo_shape query
    # TODO: implement Elasticsearch geo_distance query
    # TODO: compute risk_level from sensor + boundary overlap
    # TODO: assemble and return LocationCheckResponse
    raise NotImplementedError("check_location is not yet implemented")
