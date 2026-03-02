"""
Elasticsearch client singleton.

Authentication priority:
  1. API key  (ELASTICSEARCH_API_KEY env var) — if non-empty, used exclusively.
  2. Basic auth (ES_USERNAME / ES_PASSWORD) — fallback when API key is empty.
"""

import logging
from elasticsearch import AsyncElasticsearch
from app.config import get_settings

logger = logging.getLogger(__name__)

_es_client: AsyncElasticsearch | None = None


async def get_es_client() -> AsyncElasticsearch:
    """
    Returns the shared async Elasticsearch client.
    Initialised lazily on first call; should be called during app startup
    to eagerly surface connection issues.
    """
    global _es_client
    if _es_client is None:
        settings = get_settings()

        # Build common kwargs
        kwargs: dict = {
            "hosts": [settings.es_host],
            "verify_certs": False,          # Disable cert verification for local dev
            "ssl_show_warn": False,          # Suppress SSL warnings in dev
            "request_timeout": 30,
        }

        # Prefer API key over basic auth
        if settings.elasticsearch_api_key:
            kwargs["api_key"] = settings.elasticsearch_api_key
            logger.info("Elasticsearch: using API key authentication")
        else:
            kwargs["basic_auth"] = (settings.es_username, settings.es_password)
            logger.info("Elasticsearch: using basic auth for user '%s'", settings.es_username)

        _es_client = AsyncElasticsearch(**kwargs)

    return _es_client


async def close_es_client() -> None:
    """Close the Elasticsearch client gracefully on app shutdown."""
    global _es_client
    if _es_client:
        await _es_client.close()
        _es_client = None
        logger.info("Elasticsearch client closed.")


async def ping_elasticsearch() -> dict:
    """
    Ping the cluster and return a health summary dict.
    Used by the /health endpoint.

    Returns:
        {"status": "ok", "cluster_name": str, "cluster_status": str}
        or
        {"status": "error", "detail": str}
    """
    try:
        es = await get_es_client()
        health = await es.cluster.health(timeout="5s")
        return {
            "status": "ok",
            "cluster_name": health.get("cluster_name", "unknown"),
            "cluster_status": health.get("status", "unknown"),
        }
    except Exception as exc:
        logger.error("Elasticsearch health check failed: %s", exc)
        return {"status": "error", "detail": str(exc)}
