"""
Flood Early Warning System — FastAPI Entry Point
================================================
Startup, middleware, router registration, and graceful shutdown.
All configuration is read from environment variables via app.config.Settings.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.elasticsearch import get_es_client, close_es_client, ping_elasticsearch
from app.db.mongodb import get_mongo_db, close_mongo_client, ping_mongodb

# ---- Routers ---------------------------------------------------------------
from app.routers import health, boundaries, location, predictions, evacuation, assistant

# ---- Logging setup ---------------------------------------------------------
settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ---- Lifespan (startup / shutdown) -----------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Runs startup logic before yielding control to the server,
    then runs shutdown logic when the server stops.
    """
    # ---- STARTUP ----
    logger.info("=== Flood Early Warning System starting up ===")

    # Eager-init Elasticsearch client and check cluster health
    try:
        es = await get_es_client()
        es_health = await ping_elasticsearch()
        if es_health["status"] == "ok":
            logger.info(
                "Elasticsearch connected — cluster: %s (%s)",
                es_health.get("cluster_name"),
                es_health.get("cluster_status"),
            )
        else:
            logger.warning("Elasticsearch connection issue at startup: %s", es_health)
    except Exception as exc:
        logger.error("Elasticsearch startup error (will retry on request): %s", exc)

    # Eager-init MongoDB client and ping
    try:
        await get_mongo_db()
        mongo_health = await ping_mongodb()
        if mongo_health["status"] == "ok":
            logger.info("MongoDB connected successfully.")
        else:
            logger.warning("MongoDB connection issue at startup: %s", mongo_health)
    except Exception as exc:
        logger.error("MongoDB startup error (will retry on request): %s", exc)

    logger.info("All startup checks complete. API is ready.")

    yield  # Server is running

    # ---- SHUTDOWN ----
    logger.info("=== Flood Early Warning System shutting down ===")
    await close_es_client()
    await close_mongo_client()
    logger.info("All connections closed. Goodbye.")


# ---- App factory -----------------------------------------------------------
app = FastAPI(
    title="Flood Early Warning System API",
    description=(
        "Real-time geospatial flood prediction and alerting. "
        "Mobile apps connect exclusively through this API; no direct Elasticsearch access."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ---- CORS ------------------------------------------------------------------
# Read allowed origins from env (comma-separated). Defaults include common
# mobile dev servers (Expo, Next.js) to work out of the box locally.
cors_origins = settings.cors_origins_list or [
    "http://localhost:3000",   # Next.js dev server
    "http://localhost:8081",   # Expo React Native dev server
    "http://localhost:19000",  # Expo Go
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS allowed origins: %s", cors_origins)


# ---- Router Registration ---------------------------------------------------
# Each router maps to an Elasticsearch index pattern and a mobile screen:
#
#   /health              → ES cluster + Mongo health ping
#   /boundaries          → flood-boundaries-* (map overlays)
#   /location            → geo_shape + geo_distance (risk check)
#   /predictions         → flood-predictions-* (next N hours)
#   /evacuation          → ORS routing avoiding flood polygons
app.include_router(health.router,      prefix="/health",      tags=["Health"])
app.include_router(boundaries.router,  prefix="/boundaries",  tags=["Boundaries"])
app.include_router(location.router,    prefix="/location",    tags=["Location"])
app.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
app.include_router(evacuation.router,  prefix="/evacuation",  tags=["Evacuation"])
app.include_router(assistant.router,   prefix="/assistant",   tags=["Assistant"])


# ---- Root ------------------------------------------------------------------
@app.get("/", tags=["Root"], summary="API root info")
async def root():
    """Returns basic service metadata. Used as a quick connectivity test."""
    return {
        "service": "Flood Early Warning System",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "health":      "/health",
            "boundaries":  "/boundaries/flood-boundaries",
            "location":    "/location/check-location",
            "predictions": "/predictions/predictions",
            "evacuation":  "/evacuation/evacuation-routes",
            "assistant":   "/assistant/ask",
        },
    }
