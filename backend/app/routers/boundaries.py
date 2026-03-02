"""
Router — GET /boundaries/flood-boundaries
Returns active flood boundary polygons stored as geo_shape in Elasticsearch.
Mobile app uses these to draw flood zone overlays on the map.
"""

import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from app.schemas import FloodBoundariesResponse, FloodBoundaryItem
from app.db.elasticsearch import get_es_client
from elasticsearch import AsyncElasticsearch

logger = logging.getLogger(__name__)
router = APIRouter()

# Elasticsearch index pattern for flood boundaries
BOUNDARIES_INDEX = "flood-discharge-*"


@router.get(
    "/flood-boundaries",
    response_model=FloodBoundariesResponse,
    summary="Fetch active flood boundary polygons",
)
async def get_flood_boundaries(
    country: str | None = Query(
        default=None,
        description="Filter by ISO country code (e.g. AU, TH, ID)"
    ),
    active_only: bool = Query(
        default=True,
        description="When true, only return currently active boundaries"
    ),
    at_time: str | None = Query(
        default=None,
        description=(
            "ISO8601 datetime. When provided, filter boundaries whose "
            "valid_from <= at_time <= valid_until. "
            "Example: 2024-01-15T06:00:00Z"
        ),
    ),
    lat: float | None = Query(
        default=None,
        ge=-90, le=90,
        description="Filter boundaries by geo_distance (requires lon)"
    ),
    lon: float | None = Query(
        default=None,
        ge=-180, le=180,
        description="Filter boundaries by geo_distance (requires lat)"
    ),
    es: AsyncElasticsearch = Depends(get_es_client),
):
    """
    Returns flood boundary polygons from Elasticsearch.

    Query logic:
      - Bool filter: active == true (when active_only=True)
      - Optional: country term filter
      - Optional: valid_from/valid_until range filter keyed to at_time
    """
    must_filters = []

    # Active boundary filter is not relevant for live flood discharge
    # but we will sort by timestamp to get the newest

    # Optional country filter
    if country:
        must_filters.append({"term": {"country": country.upper()}})

    # Optional local radius search
    if lat is not None and lon is not None:
        must_filters.append({
            "geo_distance": {
                "distance": "50km",
                "location": {"lat": lat, "lon": lon},
            }
        })

    # Optional time-scoped filter: boundary must be valid at the given moment
    if at_time:
        must_filters.append({
            "range": {"valid_from": {"lte": at_time}}
        })
        must_filters.append({
            "range": {"valid_until": {"gte": at_time}}
        })

    query = {
        "bool": {
            "filter": must_filters if must_filters else [{"match_all": {}}]
        }
    }

    try:
        # Get the latest 10000 documents (ES max default) to handle dense regional grids
        result = await es.search(
            index=BOUNDARIES_INDEX,
            body={
                "query": query,
                "size": 10000,
                "sort": [{"timestamp": {"order": "desc"}}]
            },
        )
    except Exception as exc:
        logger.error("ES boundaries query failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Elasticsearch error: {exc}")

    hits = result["hits"]["hits"]
    total = result["hits"]["total"]["value"]

    boundaries = []
    for hit in hits:
        src = hit["_source"]
        try:
            boundaries.append(
                FloodBoundaryItem(
                    boundary_id=hit["_id"],
                    region_name=src.get("region", "Unknown").replace("_", " ").title(),
                    country=src.get("country", ""),
                    risk_level=src.get("risk_level", "low"),
                    severity=float(src.get("river_discharge_m3s", 0.0)),
                    active=True,
                    valid_from=src.get("timestamp"),
                    valid_until=None, # Live data has no specific end time
                    # Return the raw GeoJSON geometry dict for the mobile map
                    geometry=src.get("grid_cell", {}),
                )
            )
        except Exception as mapping_err:
            # Log bad documents but don't crash the whole response
            logger.warning("Skipping boundary doc %s due to mapping error: %s", hit["_id"], mapping_err)

    logger.info("Returned %d/%d boundary documents (country=%s, active_only=%s)", len(boundaries), total, country, active_only)
    return FloodBoundariesResponse(total=total, boundaries=boundaries)
