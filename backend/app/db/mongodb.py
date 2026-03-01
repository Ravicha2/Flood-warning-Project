"""
MongoDB client singleton.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

_mongo_client: AsyncIOMotorClient | None = None


async def get_mongo_db():
    """
    Returns the shared async MongoDB database handle.
    Database name: flood_warning
    Collections:
      - users         : registered users and notification preferences
      - evacuations   : stored evacuation route results
      - audit_log     : query audit trail
    TODO: Call during startup to validate connectivity.
    """
    global _mongo_client
    if _mongo_client is None:
        settings = get_settings()
        _mongo_client = AsyncIOMotorClient(settings.mongo_uri)
    return _mongo_client["flood_warning"]


async def close_mongo_client():
    global _mongo_client
    if _mongo_client:
        _mongo_client.close()
        _mongo_client = None
