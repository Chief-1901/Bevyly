"""Pydantic models for request/response schemas."""

from .requests import (
    ParsePromptRequest,
    SearchRequest,
    CrawlRequest,
    ScoreLeadsRequest,
)
from .responses import (
    ICPCriteria,
    LocationCriteria,
    EmployeeRange,
    RevenueRange,
    ParsePromptResponse,
    SearchResult,
    SearchResponse,
    CompanyInfo,
    ContactInfo,
    CrawlResponse,
    ScoredLead,
    ScoreLeadsResponse,
    HealthResponse,
)

__all__ = [
    # Requests
    "ParsePromptRequest",
    "SearchRequest",
    "CrawlRequest",
    "ScoreLeadsRequest",
    # Responses
    "ICPCriteria",
    "LocationCriteria",
    "EmployeeRange",
    "RevenueRange",
    "ParsePromptResponse",
    "SearchResult",
    "SearchResponse",
    "CompanyInfo",
    "ContactInfo",
    "CrawlResponse",
    "ScoredLead",
    "ScoreLeadsResponse",
    "HealthResponse",
]
