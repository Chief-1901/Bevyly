"""Request models for the Crawl4AI API."""

from typing import Any, Optional

from pydantic import BaseModel, Field


class ParsePromptRequest(BaseModel):
    """Request to parse a natural language prompt into ICP criteria."""

    prompt: str = Field(..., description="Natural language description of target leads")
    context: Optional[dict[str, Any]] = Field(
        default=None, description="Optional tenant/user context"
    )


class SearchCredentials(BaseModel):
    """API credentials for search sources."""

    google_api_key: Optional[str] = None
    google_cx: Optional[str] = None  # Custom Search Engine ID
    google_maps_api_key: Optional[str] = None


class SearchRequest(BaseModel):
    """Request to search for companies across multiple sources."""

    criteria: dict[str, Any] = Field(..., description="ICP criteria from parse-prompt")
    sources: list[str] = Field(
        default=["google_search"],
        description="Sources to search: google_search, google_maps, website_crawl",
    )
    credentials: Optional[SearchCredentials] = Field(
        default=None, description="API credentials (uses env vars if not provided)"
    )
    max_results: int = Field(default=50, ge=1, le=200, description="Maximum results to return")


class CrawlRequest(BaseModel):
    """Request to deep crawl a website."""

    url: str = Field(..., description="Website URL to crawl")
    extract_contacts: bool = Field(default=True, description="Try to extract contact info")
    max_pages: int = Field(default=10, ge=1, le=50, description="Maximum pages to crawl")
    include_about: bool = Field(default=True, description="Prioritize about/team pages")
    include_careers: bool = Field(default=True, description="Prioritize careers pages")


class LeadData(BaseModel):
    """Lead data for scoring."""

    id: Optional[str] = None
    company_name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[dict[str, str]] = None
    employee_count_estimate: Optional[int] = None
    description: Optional[str] = None
    technologies: Optional[list[str]] = None
    signals: Optional[list[str]] = None


class ScoreLeadsRequest(BaseModel):
    """Request to score leads against ICP criteria."""

    leads: list[LeadData] = Field(..., description="Leads to score")
    criteria: dict[str, Any] = Field(..., description="ICP criteria to score against")
