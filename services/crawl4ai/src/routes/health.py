"""Health check routes."""

from datetime import datetime

from fastapi import APIRouter

from ..models.responses import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check service health."""
    return HealthResponse(
        status="healthy",
        service="bevyly-crawl4ai",
        version="0.1.0",
        timestamp=datetime.utcnow(),
    )


@router.get("/ready")
async def readiness_check() -> dict:
    """Check service readiness."""
    # Could add checks for dependencies here
    return {"ready": True}
