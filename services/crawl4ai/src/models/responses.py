"""Response models for the Crawl4AI API."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class LocationCriteria(BaseModel):
    """Location criteria for ICP."""

    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class EmployeeRange(BaseModel):
    """Employee count range."""

    min: Optional[int] = None
    max: Optional[int] = None


class RevenueRange(BaseModel):
    """Revenue range."""

    min: Optional[int] = None
    max: Optional[int] = None


class ICPCriteria(BaseModel):
    """Ideal Customer Profile criteria parsed from prompt."""

    industries: list[str] = Field(default_factory=list)
    locations: list[LocationCriteria] = Field(default_factory=list)
    employee_range: Optional[EmployeeRange] = None
    revenue_range: Optional[RevenueRange] = None
    keywords: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    signals: list[str] = Field(default_factory=list)  # hiring, funding, expanding
    exclude_keywords: list[str] = Field(default_factory=list)
    search_queries: list[str] = Field(default_factory=list)


class ParsePromptResponse(BaseModel):
    """Response from prompt parsing."""

    criteria: ICPCriteria
    confidence: float = Field(ge=0, le=1, description="Confidence in parsing accuracy")
    reasoning: str = Field(description="Explanation of how prompt was interpreted")


class SearchResult(BaseModel):
    """Single search result."""

    source: str = Field(description="Source of result: google_search, google_maps, etc.")
    company_name: str
    domain: Optional[str] = None
    url: Optional[str] = None
    snippet: Optional[str] = None
    industry: Optional[str] = None
    location: Optional[LocationCriteria] = None
    employee_count_estimate: Optional[str] = None
    confidence: float = Field(default=0.5, ge=0, le=1)
    raw_data: Optional[dict[str, Any]] = None


class SearchResponse(BaseModel):
    """Response from search operation."""

    results: list[SearchResult]
    total: int
    sources_used: list[str]
    search_queries_used: list[str]


class ContactInfo(BaseModel):
    """Extracted contact information."""

    name: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    phone: Optional[str] = None


class SocialLinks(BaseModel):
    """Social media links."""

    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    github: Optional[str] = None


class CompanyInfo(BaseModel):
    """Extracted company information from website crawl."""

    name: Optional[str] = None
    domain: str
    description: Optional[str] = None
    industry: Optional[str] = None
    employee_count_estimate: Optional[int] = None
    location: Optional[LocationCriteria] = None
    technologies: list[str] = Field(default_factory=list)
    social_links: Optional[SocialLinks] = None
    founded_year: Optional[int] = None
    has_careers_page: bool = False
    is_hiring: bool = False


class CrawlResponse(BaseModel):
    """Response from website crawl."""

    company: CompanyInfo
    contacts: list[ContactInfo] = Field(default_factory=list)
    pages_crawled: int
    fit_score_estimate: int = Field(ge=0, le=100)
    crawl_time_seconds: float


class ScoreBreakdown(BaseModel):
    """Breakdown of how score was calculated."""

    industry_match: float = Field(ge=0, le=1)
    size_match: float = Field(ge=0, le=1)
    location_match: float = Field(ge=0, le=1)
    keyword_match: float = Field(ge=0, le=1)
    signal_match: float = Field(ge=0, le=1)


class ScoredLead(BaseModel):
    """Lead with calculated fit score."""

    lead_id: Optional[str] = None
    company_name: str
    domain: Optional[str] = None
    fit_score: int = Field(ge=0, le=100)
    score_breakdown: ScoreBreakdown
    match_reasons: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)


class ScoreLeadsResponse(BaseModel):
    """Response from lead scoring."""

    scored_leads: list[ScoredLead]
    total_scored: int
    avg_fit_score: float


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "healthy"
    service: str = "bevyly-crawl4ai"
    version: str = "0.1.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
