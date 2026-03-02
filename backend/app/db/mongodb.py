"""
MongoDB client singleton using Motor (async driver).

Collections in database 'flood_warning':
  - users       : registered users and notification preferences
  - evacuations : stored evacuation route results
  - audit_log   : query audit trail
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import get_settings

logger = logging.getLogger(__name__)

_mongo_client: AsyncIOMotorClient | None = None


async def get_mongo_db() -> AsyncIOMotorDatabase:
    """
    Returns the shared async MongoDB database handle.
    Initialised lazily on first call.
    """
    global _mongo_client
    if _mongo_client is None:
        settings = get_settings()
        _mongo_client = AsyncIOMotorClient(settings.mongo_uri)
        logger.info("MongoDB client initialised.")
    return _mongo_client["flood_warning"]


async def close_mongo_client() -> None:
    """Close the MongoDB client gracefully on app shutdown."""
    global _mongo_client
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
        logger.info("MongoDB client closed.")


async def ping_mongodb() -> dict:
    """
    Ping MongoDB and return a status dict.
    Used by the /health endpoint.

    Returns:
        {"status": "ok"}
        or
        {"status": "error", "detail": str}
    """
    try:
        db = await get_mongo_db()
        await db.command("ping")
        return {"status": "ok"}
    except Exception as exc:
        logger.error("MongoDB health check failed: %s", exc)
        return {"status": "error", "detail": str(exc)}
