"""Configuration management for Crawl4AI service."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Service configuration
    service_name: str = "bevyly-crawl4ai"
    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = False
    log_level: str = "INFO"

    # OpenAI configuration (for prompt parsing)
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4-turbo-preview"
    openai_temperature: float = 0.3

    # Google Search API (optional - can be passed per request)
    google_search_api_key: Optional[str] = None
    google_search_engine_id: Optional[str] = None

    # Google Maps API (optional)
    google_maps_api_key: Optional[str] = None

    # Rate limiting
    max_concurrent_crawls: int = 5
    crawl_timeout_seconds: int = 30
    max_pages_per_crawl: int = 10

    # Cache settings
    cache_ttl_seconds: int = 3600  # 1 hour


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
