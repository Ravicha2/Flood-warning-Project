"""
Router — GET /evacuation-routes
Returns recommended evacuation route from a given coordinate.
"""

from fastapi import APIRouter, Query
from app.schemas import EvacuationRouteResponse, GeoPoint

router = APIRouter()


@router.get("/evacuation-routes", response_model=EvacuationRouteResponse)
async def get_evacuation_routes(
    lat: float = Query(..., ge=-90,  le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """
    Calculate the safest evacuation route from the given point.

    Steps to implement:
    1. Query flood-boundaries-* to identify flood zones to avoid
    2. Query flood-sensors-* to find sensors with low risk_level (safe zones)
    3. Use Elasticsearch geo_distance aggregation to find nearest safe assembly point
    4. Build waypoint list routing around flood polygons
    5. (Optional) Integrate with OpenStreetMap Routing Machine (OSRM) for road-level routing
    """
    # TODO: implement route calculation
    raise NotImplementedError("get_evacuation_routes is not yet implemented")
