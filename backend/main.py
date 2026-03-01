"""
Flood Early Warning System — FastAPI Entry Point
================================================
Application startup, middleware, and router registration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# TODO: import routers
# from app.routers import location, boundaries, evacuation, predictions, health

app = FastAPI(
    title="Flood Early Warning System API",
    description="Real-time geospatial flood prediction and alerting",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ----------------------------------------------------------
# CORS — allow Next.js frontend during development
# ----------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        # TODO: add production URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------
# Startup / Shutdown Events
# ----------------------------------------------------------
@app.on_event("startup")
async def startup():
    """
    TODO: Initialize shared resources on startup:
      - Connect Elasticsearch client
      - Connect MongoDB client
      - Validate index templates exist
    """
    pass


@app.on_event("shutdown")
async def shutdown():
    """
    TODO: Gracefully close connections on shutdown.
    """
    pass

# ----------------------------------------------------------
# Router Registration
# TODO: Uncomment as you implement each router
# ----------------------------------------------------------
# app.include_router(health.router,       prefix="/health",      tags=["Health"])
# app.include_router(location.router,     prefix="/location",    tags=["Location"])
# app.include_router(boundaries.router,   prefix="/boundaries",  tags=["Boundaries"])
# app.include_router(evacuation.router,   prefix="/evacuation",  tags=["Evacuation"])
# app.include_router(predictions.router,  prefix="/predictions", tags=["Predictions"])

# ----------------------------------------------------------
# Root
# ----------------------------------------------------------
@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "Flood Early Warning System",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
    }
