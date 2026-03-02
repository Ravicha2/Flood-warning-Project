"""
App Configuration — reads from environment variables via pydantic-settings.
All secrets must be provided via .env or actual environment; no hardcoded defaults.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # ---- Elasticsearch ----------------------------------------
    es_host: str = "http://localhost:9200"
    es_username: str = "elastic"
    es_password: str = "changeme"
    # Optional API key — if non-empty, preferred over basic auth
    elasticsearch_api_key: Optional[str] = None

    # ---- MongoDB -----------------------------------------------
    mongo_uri: str = "mongodb://admin:changeme@localhost:27017/flood_warning?authSource=admin"

    # ---- Weather APIs ------------------------------------------
    openweathermap_api_key: str = ""
    weather_gov_base_url: str = "https://api.weather.gov"

    # ---- Routing (Evacuation) ----------------------------------
    # OpenRouteService key. Empty string → use stub fallback.
    ors_api_key: str = ""

    # ---- AWS (optional integrations) ---------------------------
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "ap-southeast-1"
    aws_sns_topic_arn: Optional[str] = None
    aws_ses_sender_email: Optional[str] = None
    aws_s3_bucket: Optional[str] = None

    # ---- FastAPI App -------------------------------------------
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    secret_key: str = "dev-secret-key-change-in-production"
    log_level: str = "INFO"
    # Comma-separated list of allowed CORS origins
    cors_origins: str = "http://localhost:3000,http://localhost:8081"

    # ---- Feature Flags -----------------------------------------
    enable_ml_predictions: bool = False
    enable_real_time_ingestion: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS env var into a list of origin strings."""
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
