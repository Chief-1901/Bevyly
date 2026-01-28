"""Discovery API routes."""

import structlog
from fastapi import APIRouter, HTTPException

from ..models.requests import (
    CrawlRequest,
    ParsePromptRequest,
    ScoreLeadsRequest,
    SearchRequest,
)
from ..models.responses import (
    CrawlResponse,
    ParsePromptResponse,
    ScoreLeadsResponse,
    SearchResponse,
)
from ..services import GoogleSearchService, LeadScorer, LLMParser, WebCrawler

router = APIRouter(prefix="/api/v1/discover", tags=["discovery"])
logger = structlog.get_logger()


@router.post("/parse-prompt", response_model=ParsePromptResponse)
async def parse_prompt(request: ParsePromptRequest) -> ParsePromptResponse:
    """Parse a natural language prompt into structured ICP criteria."""
    logger.info("Parsing prompt", prompt_length=len(request.prompt))

    try:
        parser = LLMParser()
        result = await parser.parse_prompt(request.prompt, request.context)
        return result
    except Exception as e:
        logger.error("Failed to parse prompt", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to parse prompt: {str(e)}")


@router.post("/search", response_model=SearchResponse)
async def search_companies(request: SearchRequest) -> SearchResponse:
    """Search for companies across multiple sources."""
    logger.info(
        "Searching companies",
        sources=request.sources,
        max_results=request.max_results,
    )

    all_results = []
    sources_used = []
    search_queries = request.criteria.get("search_queries", [])

    if not search_queries:
        # Generate basic queries from criteria
        industries = request.criteria.get("industries", [])
        locations = request.criteria.get("locations", [])
        if industries:
            base = " ".join(industries[:2])
            if locations and locations[0]:
                loc = locations[0]
                loc_str = loc.get("city") or loc.get("state") or loc.get("country") or ""
                search_queries = [f"{base} companies {loc_str}"]
            else:
                search_queries = [f"{base} companies"]

    try:
        # Google Search
        if "google_search" in request.sources:
            creds = request.credentials
            google_service = GoogleSearchService(
                api_key=creds.google_api_key if creds else None,
                search_engine_id=creds.google_cx if creds else None,
            )
            results = await google_service.search(search_queries, request.max_results)
            all_results.extend(results)
            if results:
                sources_used.append("google_search")

        # Google Maps
        if "google_maps" in request.sources:
            creds = request.credentials
            google_service = GoogleSearchService(
                maps_api_key=creds.google_maps_api_key if creds else None,
            )
            # Get location from criteria
            locations = request.criteria.get("locations", [])
            location = locations[0] if locations else None

            query = " ".join(request.criteria.get("industries", ["companies"]))
            results = await google_service.search_maps(
                query,
                location=location,
                max_results=request.max_results // 2,
            )
            all_results.extend(results)
            if results:
                sources_used.append("google_maps")

        # Website crawl for discovered domains
        if "website_crawl" in request.sources:
            crawler = WebCrawler()
            crawl_results = []

            # Crawl top results to get more info
            for result in all_results[:5]:
                if result.url:
                    try:
                        crawl_data = await crawler.crawl_website(
                            result.url,
                            extract_contacts=False,
                            max_pages=3,
                        )
                        # Enrich the search result
                        if crawl_data.company.industry:
                            result.industry = crawl_data.company.industry
                        if crawl_data.company.location:
                            result.location = crawl_data.company.location
                    except Exception as e:
                        logger.warning("Crawl failed for result", url=result.url, error=str(e))

            if crawl_results:
                sources_used.append("website_crawl")

        # Deduplicate by domain
        seen_domains = set()
        unique_results = []
        for result in all_results:
            key = result.domain or result.company_name.lower()
            if key not in seen_domains:
                seen_domains.add(key)
                unique_results.append(result)

        return SearchResponse(
            results=unique_results[: request.max_results],
            total=len(unique_results),
            sources_used=sources_used,
            search_queries_used=search_queries,
        )

    except Exception as e:
        logger.error("Search failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/crawl", response_model=CrawlResponse)
async def crawl_website(request: CrawlRequest) -> CrawlResponse:
    """Deep crawl a website to extract company and contact info."""
    logger.info("Crawling website", url=request.url, max_pages=request.max_pages)

    try:
        crawler = WebCrawler()
        result = await crawler.crawl_website(
            url=request.url,
            extract_contacts=request.extract_contacts,
            max_pages=request.max_pages,
            include_about=request.include_about,
            include_careers=request.include_careers,
        )
        return result
    except Exception as e:
        logger.error("Crawl failed", url=request.url, error=str(e))
        raise HTTPException(status_code=500, detail=f"Crawl failed: {str(e)}")


@router.post("/score", response_model=ScoreLeadsResponse)
async def score_leads(request: ScoreLeadsRequest) -> ScoreLeadsResponse:
    """Score leads against ICP criteria."""
    logger.info("Scoring leads", num_leads=len(request.leads))

    try:
        scorer = LeadScorer()
        result = scorer.score_leads(request.leads, request.criteria)
        return result
    except Exception as e:
        logger.error("Scoring failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")
