"""
App Configuration — reads from environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Elasticsearch
    es_host: str = "http://localhost:9200"
    es_username: str = "elastic"
    es_password: str = "changeme"

    # MongoDB
    mongo_uri: str = "mongodb://admin:changeme@localhost:27017/flood_warning?authSource=admin"

    # Weather APIs
    openweathermap_api_key: str = ""
    weather_gov_base_url: str = "https://api.weather.gov"

    # App
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    secret_key: str = "dev-secret-key"
    enable_ml_predictions: bool = False
    enable_real_time_ingestion: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
