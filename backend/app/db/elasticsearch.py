"""
Elasticsearch client singleton.
"""

from elasticsearch import AsyncElasticsearch
from app.config import get_settings
from functools import lru_cache

_es_client: AsyncElasticsearch | None = None


async def get_es_client() -> AsyncElasticsearch:
    """
    Returns the shared Elasticsearch async client.
    TODO: Call this during app startup to validate connectivity.
    """
    global _es_client
    if _es_client is None:
        settings = get_settings()
        _es_client = AsyncElasticsearch(
            hosts=[settings.es_host],
            basic_auth=(settings.es_username, settings.es_password),
            verify_certs=False,  # TODO: enable in production
            request_timeout=30,
        )
    return _es_client


async def close_es_client():
    global _es_client
    if _es_client:
        await _es_client.close()
        _es_client = None
