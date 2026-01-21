import { Suspense } from 'react';
import {
  opportunitiesApi,
  contactsApi,
  accountsApi,
  leadsApi,
  sequencesApi,
  type Opportunity,
  type Account,
  type Lead,
} from '@/lib/api/server';
import { AnalyticsContent } from './AnalyticsContent';
import { AnalyticsSkeleton } from './AnalyticsSkeleton';

// Force dynamic rendering (needs auth cookies)
export const dynamic = 'force-dynamic';

export interface AnalyticsData {
  // Pipeline metrics
  pipelineStages: { stage: string; count: number; amount: number }[];
  totalPipeline: number;
  avgDealSize: number;
  
  // Win/Loss metrics
  wonDeals: number;
  lostDeals: number;
  winRate: number;
  
  // Lead metrics
  totalLeads: number;
  leadsByStatus: { status: string; count: number }[];
  conversionRate: number;
  
  // Activity metrics
  totalAccounts: number;
  totalContacts: number;
  activeSequences: number;
  
  // Trend data (for charts)
  revenueByStage: { category: string; amount: number; percentage: number }[];
  leadsOverTime: { date: string; count: number }[];
  opportunitiesOverTime: { date: string; count: number; value: number }[];
}

async function fetchAnalyticsData(): Promise<AnalyticsData | null> {
  try {
    // Fetch data in parallel
    const [
      pipelineResult,
      opportunitiesResult,
      contactsResult,
      accountsResult,
      leadsResult,
      leadCountsResult,
      sequencesResult,
    ] = await Promise.all([
      opportunitiesApi.getPipeline(),
      opportunitiesApi.list({ limit: 100 }),
      contactsApi.list({ limit: 1 }),
      accountsApi.list({ limit: 1 }),
      leadsApi.list({ limit: 100 }),
      leadsApi.getCounts(),
      sequencesApi.list({ limit: 100 }),
    ]);

    // Handle pipeline data
    const pipeline = pipelineResult.success && pipelineResult.data ? pipelineResult.data : [];
    const totalPipeline = pipeline.reduce((sum, stage) => sum + (stage.totalAmount || 0), 0) / 100;
    const totalDeals = pipeline.reduce((sum, stage) => sum + (stage.count || 0), 0);
    const avgDealSize = totalDeals > 0 ? totalPipeline / totalDeals : 0;

    // Calculate win/loss
    const wonDeals = pipeline.find((s) => s.stage === 'closed_won')?.count || 0;
    const lostDeals = pipeline.find((s) => s.stage === 'closed_lost')?.count || 0;
    const winRate = wonDeals + lostDeals > 0 ? (wonDeals / (wonDeals + lostDeals)) * 100 : 0;

    // Build pipeline stages
    const pipelineStages = pipeline.map((stage) => ({
      stage: formatStageName(stage.stage),
      count: stage.count || 0,
      amount: (stage.totalAmount || 0) / 100,
    }));

    // Build revenue by stage for chart
    const revenueByStage = pipeline
      .filter((stage) => stage.totalAmount > 0)
      .map((stage) => ({
        category: formatStageName(stage.stage),
        amount: (stage.totalAmount || 0) / 100,
        percentage: totalPipeline > 0 ? (((stage.totalAmount || 0) / 100) / totalPipeline) * 100 : 0,
      }));

    // Get counts from results
    const totalContacts =
      contactsResult.success && 'pagination' in contactsResult
        ? (contactsResult as { pagination: { total: number } }).pagination?.total || 0
        : 0;
    const totalAccounts =
      accountsResult.success && 'pagination' in accountsResult
        ? (accountsResult as { pagination: { total: number } }).pagination?.total || 0
        : 0;

    // Get leads data
    const leads: Lead[] =
      leadsResult.success && leadsResult.data && 'data' in leadsResult.data
        ? (leadsResult.data as { data: Lead[] }).data
        : leadsResult.success && Array.isArray(leadsResult.data)
        ? leadsResult.data
        : [];
    const totalLeads = leads.length;

    // Lead counts by status
    const leadCounts = leadCountsResult.success && leadCountsResult.data ? leadCountsResult.data : {};
    const leadsByStatus = Object.entries(leadCounts).map(([status, count]) => ({
      status: formatLeadStatus(status),
      count: count as number,
    }));

    // Calculate lead conversion rate
    const convertedLeads = (leadCounts as Record<string, number>).converted || 0;
    const leadConversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Active sequences count
    const sequences =
      sequencesResult.success && sequencesResult.data && 'data' in sequencesResult.data
        ? (sequencesResult.data as { data: unknown[] }).data
        : sequencesResult.success && Array.isArray(sequencesResult.data)
        ? sequencesResult.data
        : [];
    const activeSequences = sequences.filter((s: { status?: string }) => s.status === 'active').length;

    // Get opportunities for trend analysis
    const opportunities: Opportunity[] =
      opportunitiesResult.success && opportunitiesResult.data && 'data' in opportunitiesResult.data
        ? (opportunitiesResult.data as { data: Opportunity[] }).data
        : opportunitiesResult.success && Array.isArray(opportunitiesResult.data)
        ? opportunitiesResult.data
        : [];

    // Group opportunities by month
    const opportunitiesByMonth = groupByMonth(
      opportunities,
      (o) => o.createdAt,
      (o) => (o.amount || 0) / 100
    );

    // Group leads by month
    const leadsByMonth = groupByMonth(leads, (l) => l.createdAt);

    return {
      pipelineStages,
      totalPipeline,
      avgDealSize,
      wonDeals,
      lostDeals,
      winRate,
      totalLeads,
      leadsByStatus,
      conversionRate: leadConversionRate,
      totalAccounts,
      totalContacts,
      activeSequences,
      revenueByStage,
      leadsOverTime: leadsByMonth,
      opportunitiesOverTime: opportunitiesByMonth,
    };
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    return null;
  }
}

function formatStageName(stage: string): string {
  const names: Record<string, string> = {
    prospecting: 'Prospecting',
    qualification: 'Qualification',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    closed_won: 'Closed Won',
    closed_lost: 'Closed Lost',
  };
  return names[stage] || stage;
}

function formatLeadStatus(status: string): string {
  const names: Record<string, string> = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    converted: 'Converted',
    rejected: 'Rejected',
  };
  return names[status] || status;
}

function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string,
  getValue?: (item: T) => number
): { date: string; count: number; value: number }[] {
  const grouped = new Map<string, { count: number; value: number }>();
  
  items.forEach((item) => {
    const date = new Date(getDate(item));
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = grouped.get(monthKey) || { count: 0, value: 0 };
    grouped.set(monthKey, {
      count: existing.count + 1,
      value: existing.value + (getValue ? getValue(item) : 0),
    });
  });

  // Sort by date and convert to array
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      count: data.count,
      value: data.value,
    }));
}

export default async function AnalyticsPage() {
  const data = await fetchAnalyticsData();

  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent data={data} />
    </Suspense>
  );
}
