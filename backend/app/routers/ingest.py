"""
Router — POST /ingest/generate-grid
Calculates a 5x5 grid (0.1° step) around a given coordinate,
queries Open-Meteo for flood discharge data, and POSTs it to Logstash.
"""

import logging
import asyncio
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

FLOOD_API_BASE = "https://flood-api.open-meteo.com/v1/flood"
LOGSTASH_URL = "http://localhost:8080"
GRID_STEP = 0.1

class GenerateGridRequest(BaseModel):
    latitude: float
    longitude: float

class GenerateGridResponse(BaseModel):
    status: str
    points_processed: int
    points_failed: int
    points_skipped: int

def build_grid_cell_polygon(lat: float, lon: float, half_step: float) -> dict:
    west = round(lon - half_step, 4)
    east = round(lon + half_step, 4)
    north = round(lat + half_step, 4)
    south = round(lat - half_step, 4)
    return {
        "type": "Polygon",
        "coordinates": [[
            [west, north], [east, north], [east, south],
            [west, south], [west, north]
        ]],
    }

async def fetch_and_post_point(client: httpx.AsyncClient, lat: float, lon: float, half_step: float) -> str:
    """Fetch from Open-Meteo and POST to Logstash. Returns 'success', 'skipped', or 'failed'."""
    params = {
        "latitude": round(lat, 4),
        "longitude": round(lon, 4),
        "daily": "river_discharge",
        "past_days": 1,
        "forecast_days": 0,
    }
    
    try:
        resp = await client.get(FLOOD_API_BASE, params=params, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()
        
        times = data.get("daily", {}).get("time", [])
        discharges = data.get("daily", {}).get("river_discharge", [])
        
        if not times or not discharges or discharges[-1] is None:
            return 'skipped'

        record = {
            "region": "dynamic_query",
            "country": "XX",  # Dynamic, unmapped
            "latitude": lat,
            "longitude": lon,
            "river_discharge_m3s": discharges[-1],
            "timestamp": times[-1],
            "location": {"lat": lat, "lon": lon},
            "grid_cell": build_grid_cell_polygon(lat, lon, half_step),
        }

        # Post to Logstash
        post_resp = await client.post(LOGSTASH_URL, json=record, timeout=5.0)
        post_resp.raise_for_status()
        return 'success'
    except Exception as exc:
        logger.error(f"Failed processing grid point ({lat}, {lon}): {exc}")
        return 'failed'

@router.post(
    "/generate-grid",
    response_model=GenerateGridResponse,
    summary="Generate a 5x5 dynamic flood grid centered on the given coordinates",
)
async def generate_grid(payload: GenerateGridRequest):
    lat_center = payload.latitude
    lon_center = payload.longitude
    half_step = GRID_STEP / 2.0

    # Generate 5x5 grid relative to center
    points = []
    for i in range(-2, 3):
        for j in range(-2, 3):
            points.append((lat_center + (i * GRID_STEP), lon_center + (j * GRID_STEP)))

    logger.info(f"Generating dynamic grid for {lat_center}, {lon_center} ({len(points)} points)")
    
    # Process concurrently using httpx
    async with httpx.AsyncClient() as client:
        tasks = [fetch_and_post_point(client, lat, lon, half_step) for lat, lon in points]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    success = 0
    failed = 0
    skipped = 0

    for res in results:
        if isinstance(res, Exception) or res == 'failed':
            failed += 1
        elif res == 'success':
            success += 1
        elif res == 'skipped':
            skipped += 1

    logger.info(f"Dynamic grid complete: {success} sent, {skipped} skipped, {failed} failed.")

    return GenerateGridResponse(
        status="ok",
        points_processed=success,
        points_failed=failed,
        points_skipped=skipped
    )
