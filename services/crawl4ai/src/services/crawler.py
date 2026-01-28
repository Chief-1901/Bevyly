"""Web crawling service using Crawl4AI."""

import asyncio
import re
import time
from typing import Optional
from urllib.parse import urljoin, urlparse

import structlog

from ..config import get_settings
from ..models.responses import (
    CompanyInfo,
    ContactInfo,
    CrawlResponse,
    LocationCriteria,
    SocialLinks,
)

logger = structlog.get_logger()


class WebCrawler:
    """Service for crawling websites using Crawl4AI."""

    def __init__(self):
        """Initialize the web crawler."""
        self.settings = get_settings()
        self._crawler = None

    async def _get_crawler(self):
        """Lazy initialization of Crawl4AI crawler."""
        if self._crawler is None:
            try:
                from crawl4ai import AsyncWebCrawler
                self._crawler = AsyncWebCrawler(verbose=False)
                await self._crawler.awarmup()
            except ImportError:
                logger.warning("Crawl4AI not installed, using mock crawler")
                self._crawler = MockCrawler()
        return self._crawler

    async def crawl_website(
        self,
        url: str,
        extract_contacts: bool = True,
        max_pages: int = 10,
        include_about: bool = True,
        include_careers: bool = True,
    ) -> CrawlResponse:
        """Crawl a website and extract company/contact information."""
        start_time = time.time()
        log = logger.bind(url=url, max_pages=max_pages)
        log.info("Starting website crawl")

        crawler = await self._get_crawler()
        domain = urlparse(url).netloc.replace("www.", "")

        # Start with the main page
        pages_crawled = 0
        company_info = CompanyInfo(domain=domain)
        contacts: list[ContactInfo] = []
        all_text = ""

        try:
            # Crawl main page
            result = await asyncio.wait_for(
                crawler.arun(url=url),
                timeout=self.settings.crawl_timeout_seconds,
            )
            pages_crawled += 1

            if result.success and result.markdown:
                all_text += result.markdown
                company_info = self._extract_company_info(result.markdown, domain, url)

            # Find and crawl additional pages
            if max_pages > 1:
                links_to_crawl = self._get_priority_links(
                    result.links if hasattr(result, 'links') else {},
                    url,
                    include_about,
                    include_careers,
                )

                for link in links_to_crawl[: max_pages - 1]:
                    try:
                        sub_result = await asyncio.wait_for(
                            crawler.arun(url=link),
                            timeout=self.settings.crawl_timeout_seconds,
                        )
                        pages_crawled += 1

                        if sub_result.success and sub_result.markdown:
                            all_text += "\n\n" + sub_result.markdown

                            # Check if careers page
                            if "career" in link.lower() or "jobs" in link.lower():
                                company_info.has_careers_page = True
                                if self._detect_hiring(sub_result.markdown):
                                    company_info.is_hiring = True

                            # Extract contacts from about/team pages
                            if extract_contacts and ("about" in link.lower() or "team" in link.lower()):
                                page_contacts = self._extract_contacts(sub_result.markdown)
                                contacts.extend(page_contacts)

                    except asyncio.TimeoutError:
                        log.warning("Timeout crawling sub-page", link=link)
                    except Exception as e:
                        log.warning("Error crawling sub-page", link=link, error=str(e))

            # Extract contacts from all collected text if needed
            if extract_contacts and not contacts:
                contacts = self._extract_contacts(all_text)

            # Update company info from all text
            company_info = self._enrich_company_info(company_info, all_text)

            # Calculate fit score estimate
            fit_score = self._estimate_fit_score(company_info)

        except asyncio.TimeoutError:
            log.error("Timeout crawling main page")
            fit_score = 30
        except Exception as e:
            log.error("Error crawling website", error=str(e))
            fit_score = 30

        crawl_time = time.time() - start_time
        log.info(
            "Crawl completed",
            pages_crawled=pages_crawled,
            contacts_found=len(contacts),
            crawl_time=crawl_time,
        )

        return CrawlResponse(
            company=company_info,
            contacts=contacts[:10],  # Limit contacts
            pages_crawled=pages_crawled,
            fit_score_estimate=fit_score,
            crawl_time_seconds=round(crawl_time, 2),
        )

    def _extract_company_info(self, markdown: str, domain: str, url: str) -> CompanyInfo:
        """Extract company information from markdown content."""
        info = CompanyInfo(domain=domain)

        # Extract title/name from first heading
        title_match = re.search(r"^#\s+(.+)$", markdown, re.MULTILINE)
        if title_match:
            info.name = title_match.group(1).strip()

        # Extract description from meta or first paragraph
        desc_match = re.search(r"(?:^|\n)([A-Z][^.!?]*(?:[.!?](?:\s|$))){1,3}", markdown)
        if desc_match:
            info.description = desc_match.group(0).strip()[:500]

        # Extract social links
        social = SocialLinks()
        if match := re.search(r"linkedin\.com/company/([^\s\"'/>]+)", markdown, re.I):
            social.linkedin = f"https://linkedin.com/company/{match.group(1)}"
        if match := re.search(r"twitter\.com/([^\s\"'/>]+)", markdown, re.I):
            social.twitter = f"https://twitter.com/{match.group(1)}"
        if match := re.search(r"github\.com/([^\s\"'/>]+)", markdown, re.I):
            social.github = f"https://github.com/{match.group(1)}"
        info.social_links = social

        return info

    def _enrich_company_info(self, info: CompanyInfo, all_text: str) -> CompanyInfo:
        """Enrich company info from all crawled text."""
        text_lower = all_text.lower()

        # Detect industry
        industry_keywords = {
            "saas": ["saas", "software as a service", "cloud software"],
            "fintech": ["fintech", "financial technology", "payments", "banking software"],
            "healthcare": ["healthcare", "medical", "health tech", "healthtech"],
            "ecommerce": ["ecommerce", "e-commerce", "online store", "shopping"],
            "marketing": ["marketing", "advertising", "martech"],
            "security": ["cybersecurity", "security", "infosec"],
        }
        for industry, keywords in industry_keywords.items():
            if any(kw in text_lower for kw in keywords):
                info.industry = industry.title()
                break

        # Detect technologies
        tech_patterns = [
            r"\b(react|vue|angular|next\.?js)\b",
            r"\b(python|node\.?js|java|golang|rust)\b",
            r"\b(aws|azure|gcp|google cloud)\b",
            r"\b(kubernetes|docker|terraform)\b",
            r"\b(postgresql|mongodb|redis|elasticsearch)\b",
        ]
        techs = set()
        for pattern in tech_patterns:
            matches = re.findall(pattern, text_lower, re.I)
            techs.update(m.title() for m in matches)
        info.technologies = list(techs)[:10]

        # Detect location from contact/footer
        location_patterns = [
            r"(?:headquarter|hq|office|based in|located in)[^\n]*?([A-Z][a-z]+(?:,\s*[A-Z]{2})?)",
        ]
        for pattern in location_patterns:
            if match := re.search(pattern, all_text, re.I):
                loc_str = match.group(1)
                if "," in loc_str:
                    city, state = loc_str.split(",", 1)
                    info.location = LocationCriteria(city=city.strip(), state=state.strip(), country="US")
                else:
                    info.location = LocationCriteria(city=loc_str.strip())
                break

        return info

    def _extract_contacts(self, markdown: str) -> list[ContactInfo]:
        """Extract contact information from markdown."""
        contacts = []

        # Pattern for email addresses
        emails = set(re.findall(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", markdown))

        # Pattern for names with titles
        name_title_pattern = r"(?:^|\n)\*?\*?([A-Z][a-z]+ [A-Z][a-z]+)\*?\*?[,\s\-–]*(?:([A-Z][a-zA-Z\s&]+(?:Officer|Director|Manager|Lead|Head|VP|CEO|CTO|CFO|COO|President|Founder)))"
        for match in re.finditer(name_title_pattern, markdown):
            contact = ContactInfo(name=match.group(1).strip())
            if match.group(2):
                contact.title = match.group(2).strip()
            contacts.append(contact)

        # Pattern for LinkedIn URLs with names
        linkedin_pattern = r"linkedin\.com/in/([^\s\"'/>]+)"
        for match in re.finditer(linkedin_pattern, markdown, re.I):
            profile = match.group(1).replace("-", " ").title()
            contacts.append(ContactInfo(
                name=profile,
                linkedin_url=f"https://linkedin.com/in/{match.group(1)}",
            ))

        # Associate emails with contacts if possible
        for email in emails:
            # Try to match email with existing contact
            local_part = email.split("@")[0].lower()
            matched = False
            for contact in contacts:
                if contact.name and local_part in contact.name.lower().replace(" ", ""):
                    contact.email = email
                    matched = True
                    break
            if not matched and len(contacts) < 10:
                contacts.append(ContactInfo(email=email))

        return contacts[:10]

    def _get_priority_links(
        self,
        links: dict,
        base_url: str,
        include_about: bool,
        include_careers: bool,
    ) -> list[str]:
        """Get priority links to crawl."""
        priority_links = []
        internal_links = links.get("internal", []) if isinstance(links, dict) else []

        priority_paths = []
        if include_about:
            priority_paths.extend(["about", "team", "company", "who-we-are"])
        if include_careers:
            priority_paths.extend(["careers", "jobs", "work-with-us", "join"])

        for link in internal_links:
            href = link.get("href", "") if isinstance(link, dict) else str(link)
            for path in priority_paths:
                if path in href.lower():
                    full_url = urljoin(base_url, href)
                    if full_url not in priority_links:
                        priority_links.append(full_url)

        return priority_links

    def _detect_hiring(self, markdown: str) -> bool:
        """Detect if company is actively hiring."""
        hiring_indicators = [
            r"\bjoin our team\b",
            r"\bwe're hiring\b",
            r"\bopen positions?\b",
            r"\bcurrent openings?\b",
            r"\bjob openings?\b",
            r"\bapply now\b",
        ]
        text_lower = markdown.lower()
        return any(re.search(pattern, text_lower) for pattern in hiring_indicators)

    def _estimate_fit_score(self, company: CompanyInfo) -> int:
        """Estimate a basic fit score based on data completeness."""
        score = 40  # Base score

        if company.name:
            score += 5
        if company.description:
            score += 5
        if company.industry:
            score += 10
        if company.location:
            score += 5
        if company.technologies:
            score += 5
        if company.social_links and company.social_links.linkedin:
            score += 5
        if company.is_hiring:
            score += 10
        if company.has_careers_page:
            score += 5

        return min(score, 70)  # Cap at 70 before enrichment


class MockCrawler:
    """Mock crawler for when Crawl4AI is not installed."""

    async def awarmup(self):
        pass

    async def arun(self, url: str):
        """Return mock result."""
        class MockResult:
            success = True
            markdown = f"# Company Website\n\nThis is a mock crawl of {url}"
            links = {"internal": []}

        return MockResult()
