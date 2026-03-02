"""
Router — GET /health
System health check: pings Elasticsearch cluster and MongoDB.
Returns HTTP 200 when both are healthy, HTTP 503 on any failure.
"""

import logging
from fastapi import APIRouter, HTTPException
from app.db.elasticsearch import ping_elasticsearch
from app.db.mongodb import ping_mongodb

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", tags=["Health"], summary="System health check")
async def health_check():
    """
    Pings Elasticsearch and MongoDB.
    Returns 200 {"status": "ok", ...} when all healthy,
    or 503 {"status": "degraded", ...} if any service is down.
    """
    es_status = await ping_elasticsearch()
    mongo_status = await ping_mongodb()

    all_ok = (es_status["status"] == "ok" and mongo_status["status"] == "ok")

    response = {
        "status": "ok" if all_ok else "degraded",
        "elasticsearch": es_status,
        "mongodb": mongo_status,
    }

    if not all_ok:
        logger.warning("Health check degraded: ES=%s, Mongo=%s", es_status, mongo_status)
        raise HTTPException(status_code=503, detail=response)

    return response
