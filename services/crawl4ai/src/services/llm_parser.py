"""LLM-based prompt parsing service."""

import json
import re
from typing import Any, Optional

import structlog
from openai import AsyncOpenAI

from ..config import get_settings
from ..models.responses import ICPCriteria, ParsePromptResponse, LocationCriteria, EmployeeRange

logger = structlog.get_logger()

PARSE_PROMPT_SYSTEM = """You are an expert at parsing sales prospecting queries into structured ICP (Ideal Customer Profile) criteria.

Given a natural language description of target leads, extract:
1. Industries/verticals (be specific: "SaaS", "FinTech", "Healthcare IT", etc.)
2. Locations (cities, states, countries)
3. Company size (employee count ranges like "50-200")
4. Revenue ranges if mentioned
5. Keywords that describe the company
6. Technologies they should use
7. Signals to look for (hiring, funding, expanding, etc.)
8. Keywords to exclude
9. Generate 3-5 effective Google search queries to find these companies

IMPORTANT: Generate search queries that would work well on Google to find company websites matching the criteria.

Respond ONLY with valid JSON matching this schema:
{
  "industries": ["string"],
  "locations": [{"city": "string|null", "state": "string|null", "country": "string|null"}],
  "employee_range": {"min": number|null, "max": number|null},
  "revenue_range": {"min": number|null, "max": number|null},
  "keywords": ["string"],
  "technologies": ["string"],
  "signals": ["string"],
  "exclude_keywords": ["string"],
  "search_queries": ["string"],
  "reasoning": "string explaining your interpretation"
}"""


class LLMParser:
    """Service for parsing natural language prompts using LLM."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the LLM parser."""
        settings = get_settings()
        self.api_key = api_key or settings.openai_api_key
        self.model = settings.openai_model
        self.temperature = settings.openai_temperature

        if not self.api_key:
            logger.warning("No OpenAI API key configured - prompt parsing will use fallback")

    async def parse_prompt(
        self,
        prompt: str,
        context: Optional[dict[str, Any]] = None,
    ) -> ParsePromptResponse:
        """Parse a natural language prompt into structured ICP criteria."""
        log = logger.bind(prompt_length=len(prompt))

        if not self.api_key:
            log.info("Using fallback parser (no OpenAI key)")
            return self._fallback_parse(prompt)

        try:
            client = AsyncOpenAI(api_key=self.api_key)

            user_message = f"Parse this prospecting query:\n\n{prompt}"
            if context:
                user_message += f"\n\nContext: {json.dumps(context)}"

            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": PARSE_PROMPT_SYSTEM},
                    {"role": "user", "content": user_message},
                ],
                temperature=self.temperature,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            if not content:
                log.warning("Empty response from LLM")
                return self._fallback_parse(prompt)

            parsed = json.loads(content)
            log.info("Successfully parsed prompt with LLM", criteria_keys=list(parsed.keys()))

            return ParsePromptResponse(
                criteria=ICPCriteria(
                    industries=parsed.get("industries", []),
                    locations=[
                        LocationCriteria(**loc) for loc in parsed.get("locations", [])
                    ],
                    employee_range=(
                        EmployeeRange(**parsed["employee_range"])
                        if parsed.get("employee_range")
                        else None
                    ),
                    revenue_range=parsed.get("revenue_range"),
                    keywords=parsed.get("keywords", []),
                    technologies=parsed.get("technologies", []),
                    signals=parsed.get("signals", []),
                    exclude_keywords=parsed.get("exclude_keywords", []),
                    search_queries=parsed.get("search_queries", []),
                ),
                confidence=0.85,
                reasoning=parsed.get("reasoning", "Parsed using LLM"),
            )

        except json.JSONDecodeError as e:
            log.error("Failed to parse LLM response as JSON", error=str(e))
            return self._fallback_parse(prompt)
        except Exception as e:
            log.error("LLM parsing failed", error=str(e))
            return self._fallback_parse(prompt)

    def _fallback_parse(self, prompt: str) -> ParsePromptResponse:
        """Simple regex-based fallback parser when LLM is unavailable."""
        prompt_lower = prompt.lower()

        # Extract industries
        industries = []
        industry_keywords = [
            "saas", "fintech", "healthcare", "edtech", "ecommerce", "e-commerce",
            "retail", "manufacturing", "logistics", "real estate", "insurance",
            "banking", "technology", "software", "consulting", "marketing",
        ]
        for kw in industry_keywords:
            if kw in prompt_lower:
                industries.append(kw.title())

        # Extract locations
        locations = []
        us_states = {
            "texas": "TX", "california": "CA", "new york": "NY", "florida": "FL",
            "austin": "TX", "san francisco": "CA", "nyc": "NY", "los angeles": "CA",
            "chicago": "IL", "boston": "MA", "seattle": "WA", "denver": "CO",
        }
        for city_state, abbrev in us_states.items():
            if city_state in prompt_lower:
                if len(city_state.split()) == 1 and city_state not in ["texas", "california"]:
                    locations.append(LocationCriteria(city=city_state.title(), state=abbrev, country="US"))
                else:
                    locations.append(LocationCriteria(state=abbrev, country="US"))

        # Extract employee range
        employee_range = None
        emp_match = re.search(r"(\d+)\s*[-–to]+\s*(\d+)\s*employees?", prompt_lower)
        if emp_match:
            employee_range = EmployeeRange(min=int(emp_match.group(1)), max=int(emp_match.group(2)))

        # Extract signals
        signals = []
        if "hiring" in prompt_lower:
            signals.append("hiring")
        if "funding" in prompt_lower or "funded" in prompt_lower:
            signals.append("funding")
        if "growing" in prompt_lower or "expanding" in prompt_lower:
            signals.append("expanding")

        # Extract technologies
        technologies = []
        tech_keywords = [
            "react", "python", "node", "aws", "azure", "gcp", "kubernetes",
            "docker", "javascript", "typescript", "java", "salesforce", "hubspot",
        ]
        for tech in tech_keywords:
            if tech in prompt_lower:
                technologies.append(tech.title() if tech not in ["aws", "gcp"] else tech.upper())

        # Generate search queries
        search_queries = []
        base_query = " ".join(industries[:2]) if industries else "companies"
        if locations:
            loc = locations[0]
            loc_str = loc.city or loc.state or loc.country or ""
            search_queries.append(f"{base_query} {loc_str}")
        search_queries.append(f"{base_query} companies")
        if signals:
            search_queries.append(f"{base_query} {signals[0]}")

        return ParsePromptResponse(
            criteria=ICPCriteria(
                industries=industries,
                locations=locations,
                employee_range=employee_range,
                keywords=industries + technologies,
                technologies=technologies,
                signals=signals,
                search_queries=search_queries[:5],
            ),
            confidence=0.5,
            reasoning="Parsed using fallback regex parser (LLM unavailable)",
        )
