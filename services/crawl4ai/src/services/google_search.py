"""Google Search API service."""

from typing import Any, Optional
from urllib.parse import urlparse

import httpx
import structlog

from ..config import get_settings
from ..models.responses import LocationCriteria, SearchResult

logger = structlog.get_logger()

GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"
GOOGLE_MAPS_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"


class GoogleSearchService:
    """Service for searching via Google APIs."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        search_engine_id: Optional[str] = None,
        maps_api_key: Optional[str] = None,
    ):
        """Initialize the Google search service."""
        settings = get_settings()
        self.api_key = api_key or settings.google_search_api_key
        self.search_engine_id = search_engine_id or settings.google_search_engine_id
        self.maps_api_key = maps_api_key or settings.google_maps_api_key

    async def search(
        self,
        queries: list[str],
        max_results: int = 50,
    ) -> list[SearchResult]:
        """Search Google for companies matching queries."""
        log = logger.bind(num_queries=len(queries), max_results=max_results)

        if not self.api_key or not self.search_engine_id:
            log.warning("Google Search API not configured")
            return []

        results: list[SearchResult] = []
        seen_domains: set[str] = set()

        async with httpx.AsyncClient(timeout=30) as client:
            for query in queries:
                if len(results) >= max_results:
                    break

                try:
                    response = await client.get(
                        GOOGLE_SEARCH_URL,
                        params={
                            "key": self.api_key,
                            "cx": self.search_engine_id,
                            "q": query,
                            "num": min(10, max_results - len(results)),
                        },
                    )
                    response.raise_for_status()
                    data = response.json()

                    for item in data.get("items", []):
                        result = self._parse_search_result(item, query)
                        if result and result.domain not in seen_domains:
                            seen_domains.add(result.domain)
                            results.append(result)

                except httpx.HTTPError as e:
                    log.error("Google Search API error", query=query, error=str(e))
                except Exception as e:
                    log.error("Error processing search", query=query, error=str(e))

        log.info("Google search completed", results_found=len(results))
        return results

    async def search_maps(
        self,
        query: str,
        location: Optional[LocationCriteria] = None,
        max_results: int = 20,
    ) -> list[SearchResult]:
        """Search Google Maps for businesses."""
        log = logger.bind(query=query, max_results=max_results)

        if not self.maps_api_key:
            log.warning("Google Maps API not configured")
            return []

        # Build location-aware query
        search_query = query
        if location:
            loc_parts = [location.city, location.state, location.country]
            loc_str = ", ".join(p for p in loc_parts if p)
            if loc_str:
                search_query = f"{query} in {loc_str}"

        results: list[SearchResult] = []

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                response = await client.get(
                    GOOGLE_MAPS_URL,
                    params={
                        "key": self.maps_api_key,
                        "query": search_query,
                    },
                )
                response.raise_for_status()
                data = response.json()

                for place in data.get("results", [])[:max_results]:
                    result = self._parse_maps_result(place)
                    if result:
                        results.append(result)

            except httpx.HTTPError as e:
                log.error("Google Maps API error", error=str(e))
            except Exception as e:
                log.error("Error processing maps search", error=str(e))

        log.info("Maps search completed", results_found=len(results))
        return results

    def _parse_search_result(self, item: dict[str, Any], query: str) -> Optional[SearchResult]:
        """Parse a Google Search result item."""
        link = item.get("link", "")
        if not link:
            return None

        # Extract domain
        try:
            parsed = urlparse(link)
            domain = parsed.netloc.replace("www.", "")
        except Exception:
            return None

        # Skip common non-company sites
        skip_domains = [
            "linkedin.com", "facebook.com", "twitter.com", "youtube.com",
            "instagram.com", "wikipedia.org", "yelp.com", "glassdoor.com",
            "indeed.com", "crunchbase.com", "bloomberg.com", "forbes.com",
        ]
        if any(skip in domain.lower() for skip in skip_domains):
            return None

        # Extract company name from title
        title = item.get("title", "")
        company_name = self._extract_company_name(title)

        return SearchResult(
            source="google_search",
            company_name=company_name,
            domain=domain,
            url=link,
            snippet=item.get("snippet", "")[:300],
            confidence=0.6,
            raw_data={"query": query, "position": item.get("position")},
        )

    def _parse_maps_result(self, place: dict[str, Any]) -> Optional[SearchResult]:
        """Parse a Google Maps place result."""
        name = place.get("name", "")
        if not name:
            return None

        # Extract location
        location = None
        address = place.get("formatted_address", "")
        if address:
            parts = address.split(", ")
            if len(parts) >= 2:
                location = LocationCriteria(
                    city=parts[0] if len(parts) > 2 else None,
                    state=parts[-2] if len(parts) > 2 else parts[0],
                    country=parts[-1] if len(parts) > 1 else None,
                )

        return SearchResult(
            source="google_maps",
            company_name=name,
            domain=None,  # Maps doesn't provide domain
            url=None,
            snippet=address,
            location=location,
            confidence=0.5,
            raw_data={
                "place_id": place.get("place_id"),
                "rating": place.get("rating"),
                "user_ratings_total": place.get("user_ratings_total"),
                "types": place.get("types", []),
            },
        )

    def _extract_company_name(self, title: str) -> str:
        """Extract company name from page title."""
        # Remove common suffixes
        name = title
        suffixes = [
            " | ", " - ", " : ", " – ",
            " Home", " Official", " Website",
            " Inc", " LLC", " Ltd", " Corp",
        ]
        for suffix in suffixes:
            if suffix in name:
                name = name.split(suffix)[0]

        return name.strip()[:100]
