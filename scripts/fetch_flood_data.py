#!/usr/bin/env python3
"""
Flood Monitoring — Open-Meteo Flood API Fetcher
================================================
Generates a grid of lat/lon points for Queensland, Sumatra, and Hat Yai,
queries the Open-Meteo Flood API for river discharge data at each point,
extracts the most recent measurement, and POSTs each record (with a
GeoJSON rectangle for the grid cell) to Logstash's HTTP input.

Usage:
    python fetch_flood_data.py              # Full run — POST to Logstash
    python fetch_flood_data.py --dry-run    # Print first 3 records, no POST
    python fetch_flood_data.py --logstash-url http://host:8080  # Custom URL

Requires: requests (pip install requests)
"""

import argparse
import json
import logging
import sys
import time
from typing import Generator

import requests

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
)
log = logging.getLogger(__name__)

# ── Region definitions ───────────────────────────────────────────────────────
# Each region is a dict with bounding-box corners and grid step size.
# lat_start/lat_end are inclusive; step is in degrees.
REGIONS = {
    "hat_yai": {
        "country": "TH",
        "lat_start": 8.0,
        "lat_end": 6.0,
        "lon_start": 99.0,
        "lon_end": 102.0,
        "step": 0.1,
    },
    "queensland": {
        "country": "AU",
        "lat_start": -10.0,
        "lat_end": -29.0,      # south of lat_start → step is negative
        "lon_start": 138.0,
        "lon_end": 154.0,
        "step": 0.1,
    },
    "sumatra": {
        "country": "ID",
        "lat_start": 6.0,
        "lat_end": -6.0,
        "lon_start": 95.0,
        "lon_end": 106.0,
        "step": 0.1,
    },
}

FLOOD_API_BASE = "https://flood-api.open-meteo.com/v1/flood"
DEFAULT_LOGSTASH_URL = "http://localhost:8080"

# ── Grid generation ──────────────────────────────────────────────────────────

def generate_grid_points(region: dict) -> Generator[tuple[float, float], None, None]:
    """
    Yield (latitude, longitude) pairs covering the region's bounding box.
    Steps from lat_start toward lat_end and lon_start toward lon_end.
    """
    step = region["step"]
    lat = region["lat_start"]
    lat_end = region["lat_end"]
    lat_step = -step if lat > lat_end else step

    while (lat_step < 0 and lat >= lat_end) or (lat_step > 0 and lat <= lat_end):
        lon = region["lon_start"]
        while lon <= region["lon_end"]:
            yield (round(lat, 4), round(lon, 4))
            lon += step
        lat += lat_step


def build_grid_cell_polygon(
    lat: float, lon: float, half_step: float
) -> dict:
    """
    Build a GeoJSON Polygon (rectangle) centred on (lat, lon),
    extending ±half_step in both directions.

    Coordinates follow the GeoJSON spec: [longitude, latitude].
    The ring is closed (first == last point), wound counter-clockwise.
    """
    west = round(lon - half_step, 4)
    east = round(lon + half_step, 4)
    north = round(lat + half_step, 4)
    south = round(lat - half_step, 4)

    return {
        "type": "Polygon",
        "coordinates": [[
            [west, north],   # top-left
            [east, north],   # top-right
            [east, south],   # bottom-right
            [west, south],   # bottom-left
            [west, north],   # close ring
        ]],
    }


# ── API fetching ─────────────────────────────────────────────────────────────

def fetch_latest_discharge(lat: float, lon: float) -> dict | None:
    """
    Call the Open-Meteo Flood API for a single point and return the
    most recent (last) daily river discharge reading.

    Returns dict with keys: river_discharge_m3s, timestamp
    or None on failure.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "river_discharge",
        "past_days": 1,
        "forecast_days": 0,
    }
    try:
        resp = requests.get(FLOOD_API_BASE, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        times = data.get("daily", {}).get("time", [])
        discharges = data.get("daily", {}).get("river_discharge", [])

        if not times or not discharges:
            log.warning("No daily data returned for (%.4f, %.4f)", lat, lon)
            return None

        # Most recent = last element in the arrays
        return {
            "river_discharge_m3s": discharges[-1],
            "timestamp": times[-1],
        }
    except requests.RequestException as exc:
        log.error("API error for (%.4f, %.4f): %s", lat, lon, exc)
        return None


# ── Record building ──────────────────────────────────────────────────────────

def build_record(
    region_name: str,
    country: str,
    lat: float,
    lon: float,
    half_step: float,
    discharge_data: dict,
) -> dict:
    """
    Assemble the JSON document that will be sent to Logstash.
    Includes the grid-cell polygon for rectangular overlay in Kibana Maps.
    """
    return {
        "region": region_name,
        "country": country,
        "latitude": lat,
        "longitude": lon,
        "river_discharge_m3s": discharge_data["river_discharge_m3s"],
        "timestamp": discharge_data["timestamp"],
        "location": {"lat": lat, "lon": lon},
        "grid_cell": build_grid_cell_polygon(lat, lon, half_step),
    }


# ── Logstash posting ────────────────────────────────────────────────────────

def post_to_logstash(record: dict, logstash_url: str) -> bool:
    """POST a single JSON record to the Logstash HTTP input."""
    try:
        resp = requests.post(
            logstash_url,
            json=record,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        return True
    except requests.RequestException as exc:
        log.error("Logstash POST failed: %s", exc)
        return False


# ── Main pipeline ────────────────────────────────────────────────────────────

def run(dry_run: bool = False, logstash_url: str = DEFAULT_LOGSTASH_URL):
    """
    Main entry point.  Iterates over all regions → grid points → API calls
    → build records → POST to Logstash (or print in dry-run mode).
    """
    total_sent = 0
    total_failed = 0
    total_skipped = 0

    for region_name, region_cfg in REGIONS.items():
        half_step = region_cfg["step"] / 2.0
        points = list(generate_grid_points(region_cfg))
        log.info(
            "Region %-12s — %d grid points (step=%.1f°)",
            region_name, len(points), region_cfg["step"],
        )

        for i, (lat, lon) in enumerate(points):
            # Respect API rate limits — small delay between calls
            if i > 0:
                time.sleep(0.01)

            discharge = fetch_latest_discharge(lat, lon)
            if discharge is None or discharge["river_discharge_m3s"] is None:
                total_skipped += 1
                continue

            record = build_record(
                region_name,
                region_cfg["country"],
                lat, lon,
                half_step,
                discharge,
            )

            if dry_run:
                print(json.dumps(record, indent=2))
                total_sent += 1
                if total_sent >= 3:
                    log.info("Dry-run: printed 3 sample records. Stopping.")
                    return
                continue

            if post_to_logstash(record, logstash_url):
                total_sent += 1
            else:
                total_failed += 1

            if total_sent % 50 == 0 and total_sent > 0 and post_to_logstash(record, logstash_url): # Use total_sent for logs so skips don't hide progress
                log.info(
                    "  [%s] %d sent (%d skipped / %d processed)", region_name, total_sent, total_skipped, i + 1
                )

    log.info(
        "Done — sent=%d  failed=%d  skipped=%d",
        total_sent, total_failed, total_skipped,
    )


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Fetch flood discharge data and send to Logstash",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print first 3 records to stdout instead of posting to Logstash",
    )
    parser.add_argument(
        "--logstash-url",
        default=DEFAULT_LOGSTASH_URL,
        help=f"Logstash HTTP input URL (default: {DEFAULT_LOGSTASH_URL})",
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run, logstash_url=args.logstash_url)


if __name__ == "__main__":
    main()
