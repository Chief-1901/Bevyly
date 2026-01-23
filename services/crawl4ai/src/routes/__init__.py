"""API routes for Crawl4AI service."""

from .discovery import router as discovery_router
from .health import router as health_router

__all__ = ["discovery_router", "health_router"]
