/**
 * Health Score Calculation Utility
 *
 * Calculates account health based on engagement, opportunities, and contacts.
 * Score range: 0-100
 */

import type { Activity, Opportunity, Contact } from '@/lib/api/server';

export interface HealthScoreFactors {
  engagement: number;      // 0-40 points
  opportunities: number;   // 0-30 points
  contacts: number;        // 0-20 points
  responseRate: number;    // 0-10 points
}

export interface HealthScoreResult {
  score: number;
  factors: HealthScoreFactors;
  color: 'success' | 'warning' | 'danger';
  label: string;
  description: string;
}

export function calculateHealthScore(data: {
  activities: Activity[];
  opportunities: Opportunity[];
  contacts: Contact[];
}): HealthScoreResult {
  const factors: HealthScoreFactors = {
    engagement: 0,
    opportunities: 0,
    contacts: 0,
    responseRate: 0,
  };

  // 1. Engagement Score (0-40): Recent activity
  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentActivities = data.activities.filter(
    (a) => new Date(a.occurredAt).getTime() > last30Days
  );

  if (recentActivities.length >= 10) {
    factors.engagement = 40;
  } else if (recentActivities.length >= 5) {
    factors.engagement = 30;
  } else if (recentActivities.length >= 2) {
    factors.engagement = 20;
  } else if (recentActivities.length >= 1) {
    factors.engagement = 10;
  }

  // 2. Opportunity Score (0-30): Active opportunities
  const openOpps = data.opportunities.filter(
    (o) => !['closed_won', 'closed_lost'].includes(o.stage)
  );

  if (openOpps.length >= 3) {
    factors.opportunities = 30;
  } else if (openOpps.length >= 2) {
    factors.opportunities = 20;
  } else if (openOpps.length >= 1) {
    factors.opportunities = 15;
  }

  // 3. Contact Score (0-20): Number of contacts
  if (data.contacts.length >= 5) {
    factors.contacts = 20;
  } else if (data.contacts.length >= 3) {
    factors.contacts = 15;
  } else if (data.contacts.length >= 1) {
    factors.contacts = 10;
  }

  // 4. Response Rate Score (0-10): Placeholder for future email tracking
  factors.responseRate = 5; // Default moderate score

  // Calculate total score
  const totalScore = Math.min(
    factors.engagement + factors.opportunities + factors.contacts + factors.responseRate,
    100
  );

  // Determine color, label, and description
  let color: 'success' | 'warning' | 'danger';
  let label: string;
  let description: string;

  if (totalScore >= 75) {
    color = 'success';
    label = 'Excellent';
    description = 'High engagement, strong relationship';
  } else if (totalScore >= 50) {
    color = 'warning';
    label = 'Good';
    description = 'Moderate engagement, needs attention';
  } else if (totalScore >= 25) {
    color = 'warning';
    label = 'At Risk';
    description = 'Low engagement, requires action';
  } else {
    color = 'danger';
    label = 'Critical';
    description = 'Very low engagement, urgent attention needed';
  }

  return {
    score: totalScore,
    factors,
    color,
    label,
    description,
  };
}
