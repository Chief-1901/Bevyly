"""Lead scoring service."""

from typing import Any

import structlog

from ..models.requests import LeadData
from ..models.responses import ICPCriteria, ScoreBreakdown, ScoredLead, ScoreLeadsResponse

logger = structlog.get_logger()


class LeadScorer:
    """Service for scoring leads against ICP criteria."""

    def score_leads(
        self,
        leads: list[LeadData],
        criteria: dict[str, Any],
    ) -> ScoreLeadsResponse:
        """Score a list of leads against ICP criteria."""
        log = logger.bind(num_leads=len(leads))

        # Parse criteria into ICPCriteria if it's a dict
        if isinstance(criteria, dict):
            icp = self._dict_to_icp(criteria)
        else:
            icp = criteria

        scored_leads: list[ScoredLead] = []

        for lead in leads:
            scored = self._score_lead(lead, icp)
            scored_leads.append(scored)

        # Sort by fit score descending
        scored_leads.sort(key=lambda x: x.fit_score, reverse=True)

        avg_score = sum(l.fit_score for l in scored_leads) / len(scored_leads) if scored_leads else 0

        log.info("Lead scoring completed", avg_score=round(avg_score, 1))

        return ScoreLeadsResponse(
            scored_leads=scored_leads,
            total_scored=len(scored_leads),
            avg_fit_score=round(avg_score, 1),
        )

    def _score_lead(self, lead: LeadData, criteria: ICPCriteria) -> ScoredLead:
        """Score a single lead."""
        breakdown = ScoreBreakdown(
            industry_match=0.0,
            size_match=0.0,
            location_match=0.0,
            keyword_match=0.0,
            signal_match=0.0,
        )
        match_reasons: list[str] = []
        confidence = 0.5

        # Industry match (weight: 25%)
        if criteria.industries and lead.industry:
            lead_industry = lead.industry.lower()
            for industry in criteria.industries:
                if industry.lower() in lead_industry or lead_industry in industry.lower():
                    breakdown.industry_match = 1.0
                    match_reasons.append(f"Industry match: {lead.industry}")
                    break
            else:
                # Partial match through keywords
                for industry in criteria.industries:
                    if any(word in lead_industry for word in industry.lower().split()):
                        breakdown.industry_match = 0.5
                        match_reasons.append(f"Partial industry match: {lead.industry}")
                        break

        # Size match (weight: 20%)
        if criteria.employee_range and lead.employee_count_estimate:
            emp_count = lead.employee_count_estimate
            min_emp = criteria.employee_range.min or 0
            max_emp = criteria.employee_range.max or float("inf")

            if min_emp <= emp_count <= max_emp:
                breakdown.size_match = 1.0
                match_reasons.append(f"Size match: {emp_count} employees")
            elif emp_count < min_emp:
                # Partial score if close
                diff_ratio = emp_count / min_emp if min_emp > 0 else 0
                breakdown.size_match = max(0, diff_ratio * 0.5)
            else:
                # Over max
                diff_ratio = max_emp / emp_count if emp_count > 0 else 0
                breakdown.size_match = max(0, diff_ratio * 0.5)

        # Location match (weight: 20%)
        if criteria.locations and lead.location:
            lead_loc = lead.location
            for loc in criteria.locations:
                city_match = (
                    loc.city
                    and lead_loc.get("city")
                    and loc.city.lower() == lead_loc.get("city", "").lower()
                )
                state_match = (
                    loc.state
                    and lead_loc.get("state")
                    and loc.state.lower() in lead_loc.get("state", "").lower()
                )
                country_match = (
                    loc.country
                    and lead_loc.get("country")
                    and loc.country.lower() == lead_loc.get("country", "").lower()
                )

                if city_match:
                    breakdown.location_match = 1.0
                    match_reasons.append(f"City match: {lead_loc.get('city')}")
                    break
                elif state_match:
                    breakdown.location_match = 0.8
                    match_reasons.append(f"State match: {lead_loc.get('state')}")
                    break
                elif country_match:
                    breakdown.location_match = 0.5
                    match_reasons.append(f"Country match: {lead_loc.get('country')}")
                    break

        # Keyword match (weight: 20%)
        if criteria.keywords and lead.description:
            desc_lower = lead.description.lower()
            matched_keywords = [
                kw for kw in criteria.keywords if kw.lower() in desc_lower
            ]
            if matched_keywords:
                breakdown.keyword_match = min(1.0, len(matched_keywords) / len(criteria.keywords))
                match_reasons.append(f"Keywords: {', '.join(matched_keywords[:3])}")

        # Technology match (count as keyword match if no explicit technologies)
        if criteria.technologies and lead.technologies:
            lead_techs = {t.lower() for t in lead.technologies}
            matched_techs = [
                t for t in criteria.technologies if t.lower() in lead_techs
            ]
            if matched_techs:
                tech_score = min(1.0, len(matched_techs) / len(criteria.technologies))
                breakdown.keyword_match = max(breakdown.keyword_match, tech_score)
                match_reasons.append(f"Tech stack: {', '.join(matched_techs[:3])}")

        # Signal match (weight: 15%)
        if criteria.signals and lead.signals:
            lead_signals = {s.lower() for s in lead.signals}
            matched_signals = [
                s for s in criteria.signals if s.lower() in lead_signals
            ]
            if matched_signals:
                breakdown.signal_match = min(1.0, len(matched_signals) / len(criteria.signals))
                match_reasons.append(f"Signals: {', '.join(matched_signals)}")

        # Calculate final score with weights
        weights = {
            "industry": 0.25,
            "size": 0.20,
            "location": 0.20,
            "keyword": 0.20,
            "signal": 0.15,
        }

        weighted_score = (
            breakdown.industry_match * weights["industry"]
            + breakdown.size_match * weights["size"]
            + breakdown.location_match * weights["location"]
            + breakdown.keyword_match * weights["keyword"]
            + breakdown.signal_match * weights["signal"]
        )

        # Convert to 0-100 scale with 40 as base
        fit_score = int(40 + weighted_score * 55)  # Range: 40-95

        # Adjust confidence based on data completeness
        data_fields = [lead.industry, lead.location, lead.description, lead.employee_count_estimate]
        data_completeness = sum(1 for f in data_fields if f) / len(data_fields)
        confidence = 0.3 + data_completeness * 0.5

        return ScoredLead(
            lead_id=lead.id,
            company_name=lead.company_name,
            domain=lead.domain,
            fit_score=fit_score,
            score_breakdown=breakdown,
            match_reasons=match_reasons,
            confidence=round(confidence, 2),
        )

    def _dict_to_icp(self, criteria: dict[str, Any]) -> ICPCriteria:
        """Convert dict to ICPCriteria."""
        from ..models.responses import EmployeeRange, LocationCriteria

        locations = []
        for loc in criteria.get("locations", []):
            if isinstance(loc, dict):
                locations.append(LocationCriteria(**loc))

        employee_range = None
        if er := criteria.get("employee_range"):
            if isinstance(er, dict):
                employee_range = EmployeeRange(**er)

        return ICPCriteria(
            industries=criteria.get("industries", []),
            locations=locations,
            employee_range=employee_range,
            revenue_range=criteria.get("revenue_range"),
            keywords=criteria.get("keywords", []),
            technologies=criteria.get("technologies", []),
            signals=criteria.get("signals", []),
            exclude_keywords=criteria.get("exclude_keywords", []),
            search_queries=criteria.get("search_queries", []),
        )
