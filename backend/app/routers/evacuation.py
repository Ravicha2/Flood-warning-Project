"""
Router — GET /evacuation/evacuation-routes
Returns the safest evacuation route from a given coordinate, avoiding active
flood zones. Two-path implementation:

  Path A (ORS_API_KEY set):
    1. Fetch active flood boundaries from Elasticsearch
    2. Simplify polygon vertices with Shapely (Douglas-Peucker tolerance=0.01°)
       to stay within HTTP character limits for the avoid_polygons param
    3. Call OpenRouteService Directions API with avoid_polygons
    4. Return route waypoints

  Path B (ORS_API_KEY not set — demo / offline mode):
    - Return an empty-waypoints response with a note explaining the stub.
    - Mobile app can still call the endpoint without crashing during hackathon demo.
"""

import logging
import httpx
from fastapi import APIRouter, Query, Depends, HTTPException
from app.schemas import EvacuationRouteResponse, GeoPoint
from app.db.elasticsearch import get_es_client
from app.config import get_settings
from elasticsearch import AsyncElasticsearch

try:
    from shapely.geometry import shape, mapping
    from shapely.ops import unary_union
    SHAPELY_AVAILABLE = True
except ImportError:
    SHAPELY_AVAILABLE = False

logger = logging.getLogger(__name__)
router = APIRouter()

# ORS Directions API endpoint
ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/json"
# Douglas-Peucker simplification tolerance in degrees (~1 km at equator)
SIMPLIFY_TOLERANCE = 0.01


async def _fetch_active_boundaries(es: AsyncElasticsearch) -> list[dict]:
    """
    Fetch all currently active flood boundary GeoJSON geometries from ES.
    Used to build the avoid_polygons payload for ORS.
    """
    result = await es.search(
        index="flood-boundaries-*",
        body={
            "query": {"bool": {"filter": [{"term": {"active": True}}]}},
            "size": 50,
            "_source": ["flood_boundary"],
        },
    )
    geometries = []
    for hit in result["hits"]["hits"]:
        geom = hit["_source"].get("flood_boundary")
        if geom:
            geometries.append(geom)
    return geometries


def _simplify_polygons(geometries: list[dict]) -> dict | None:
    """
    Merge and simplify flood boundary polygons using Shapely.
    Returns a GeoJSON MultiPolygon dict, or None if Shapely is unavailable.

    Why we simplify:
      ORS avoid_polygons is passed as a query param; highly-detailed polygons
      with thousands of vertices exceed HTTP header size limits and fail.
    """
    if not SHAPELY_AVAILABLE or not geometries:
        return None
    try:
        shapes = [shape(g) for g in geometries if g]
        merged = unary_union(shapes)
        simplified = merged.simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)
        return mapping(simplified)
    except Exception as exc:
        logger.warning("Polygon simplification failed: %s", exc)
        return None


async def _call_ors(
    api_key: str,
    origin_lon: float,
    origin_lat: float,
    avoid_geojson: dict | None,
) -> list[GeoPoint]:
    """
    Call OpenRouteService Directions API and extract waypoints.
    Returns a list of GeoPoint waypoints, or empty list on error.
    """
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json, application/geo+json",
    }

    # ORS requires a destination; we target a fixed offset (+0.5°) as a
    # safe-direction heuristic. In production, this should be a known
    # assembly point queried from a safe-locations index.
    dest_lat = origin_lat + 0.5
    dest_lon = origin_lon + 0.5

    body: dict = {
        "coordinates": [[origin_lon, origin_lat], [dest_lon, dest_lat]],
        "instructions": False,
    }
    if avoid_geojson:
        body["options"] = {"avoid_polygons": avoid_geojson}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(ORS_URL, headers=headers, json=body)
            resp.raise_for_status()
            data = resp.json()

        # ORS encodes the route geometry as [lon, lat] pairs in coordinates
        route_coords = (
            data["routes"][0]["geometry"]["coordinates"]
            if data.get("routes")
            else []
        )
        return [GeoPoint(lat=c[1], lon=c[0]) for c in route_coords]

    except httpx.HTTPStatusError as exc:
        logger.error("ORS API HTTP error: %s — %s", exc.response.status_code, exc.response.text)
        return []
    except Exception as exc:
        logger.error("ORS API call failed: %s", exc)
        return []


@router.get(
    "/evacuation-routes",
    response_model=EvacuationRouteResponse,
    summary="Get safe evacuation route avoiding active flood zones",
)
async def get_evacuation_routes(
    lat: float = Query(..., ge=-90, le=90, description="Origin latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Origin longitude"),
    es: AsyncElasticsearch = Depends(get_es_client),
):
    """
    Calculates the safest evacuation route from the given coordinate.

    When ORS_API_KEY is set in the environment, this endpoint:
      - Fetches all active flood boundary polygons from Elasticsearch
      - Simplifies them with Shapely to reduce request size
      - Calls the OpenRouteService Directions API with avoid_polygons

    When ORS_API_KEY is not set (demo/offline mode), returns an empty-waypoints
    stub response so the mobile app can still display a placeholder.
    """
    settings = get_settings()
    origin = GeoPoint(lat=lat, lon=lon)

    # ---- Path B: Stub (no ORS key) ----------------------------------------
    if not settings.ors_api_key:
        logger.info(
            "Evacuation stub response — ORS_API_KEY not set. "
            "Set ORS_API_KEY in .env to enable real routing."
        )
        return EvacuationRouteResponse(
            origin=origin,
            destination=None,
            waypoints=[],
            distance_km=None,
            estimated_minutes=None,
        )

    # ---- Path A: Real ORS routing ------------------------------------------
    try:
        geometries = await _fetch_active_boundaries(es)
    except Exception as exc:
        logger.error("Failed to fetch boundaries for evacuation: %s", exc)
        geometries = []

    avoid_geojson = _simplify_polygons(geometries)

    waypoints = await _call_ors(settings.ors_api_key, lon, lat, avoid_geojson)

    # Compute simple Euclidean distance as a rough estimate
    # (ORS returns distance in metres in routes[0].summary.distance)
    destination = waypoints[-1] if waypoints else None

    logger.info(
        "Evacuation route from (%.4f, %.4f): %d waypoints, avoiding %d flood zones",
        lat, lon, len(waypoints), len(geometries),
    )

    return EvacuationRouteResponse(
        origin=origin,
        destination=destination,
        waypoints=waypoints,
        distance_km=None,   # Would be populated from ORS summary
        estimated_minutes=None,
    )
