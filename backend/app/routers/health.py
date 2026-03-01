"""
Router — GET /health
System health check endpoint.
"""

from fastapi import APIRouter, Depends
from app.db.elasticsearch import get_es_client
from app.db.mongodb import get_mongo_db

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check(
    es=Depends(get_es_client),
    db=Depends(get_mongo_db),
):
    """
    Returns health status of Elasticsearch and MongoDB connections.
    """
    # TODO: ping Elasticsearch and return cluster health
    # TODO: ping MongoDB and return server status
    return {
        "status": "ok",
        "elasticsearch": "TODO",
        "mongodb": "TODO",
    }
