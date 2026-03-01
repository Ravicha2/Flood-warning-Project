"""
Router — GET /flood-boundaries
Returns active flood boundary polygons.
"""

from fastapi import APIRouter, Depends, Query
from app.schemas import FloodBoundariesResponse
from app.db.elasticsearch import get_es_client

router = APIRouter()


@router.get("/flood-boundaries", response_model=FloodBoundariesResponse)
async def get_flood_boundaries(
    country: str | None = Query(default=None, description="Filter by country code (AU, TH, ID)"),
    active_only: bool = Query(default=True, description="Return only currently active boundaries"),
    es=Depends(get_es_client),
):
    """
    Return active flood boundary polygons (geo_shape).

    Steps to implement:
    1. Build bool query with filter for active=True and optional country term
    2. Execute search against flood-boundaries-* index
    3. Map hits to FloodBoundaryItem list
    """
    # TODO: build and execute Elasticsearch query
    # TODO: map hits to FloodBoundaryItem
    raise NotImplementedError("get_flood_boundaries is not yet implemented")
