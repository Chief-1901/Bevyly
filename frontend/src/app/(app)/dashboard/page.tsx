import { Suspense } from 'react';
import {
  opportunitiesApi,
  contactsApi,
  accountsApi,
  meetingsApi,
  type Opportunity,
  type Account,
  type Meeting,
} from '@/lib/api/server';
import { DashboardContent } from './DashboardContent';
import { DashboardSkeleton } from './DashboardSkeleton';

// Force dynamic rendering (needs auth cookies)
export const dynamic = 'force-dynamic';

interface DashboardData {
  totalRevenue: number;
  totalRevenueChange: number;
  totalOrders: number;
  totalOrdersChange: number;
  newCustomers: number;
  newCustomersChange: number;
  conversionRate: number;
  conversionRateChange: number;
  revenueBreakdown: { category: string; amount: number; percentage: number }[];
  recentTransactions: {
    id: string;
    customer: string;
    product: string;
    status: 'success' | 'pending' | 'refunded';
    quantity: number;
    unitPrice: number;
    totalRevenue: number;
    date: string;
  }[];
  upcomingMeetings: Meeting[];
}

async function fetchDashboardData(): Promise<DashboardData | null> {
  try {
    // Fetch data in parallel
    const [pipelineResult, opportunitiesResult, contactsResult, accountsResult, meetingsResult] =
      await Promise.all([
        opportunitiesApi.getPipeline(),
        opportunitiesApi.list({ limit: 10 }),
        contactsApi.list({ limit: 1 }),
        accountsApi.list({ limit: 100 }),
        meetingsApi.upcoming(5),
      ]);

    // Handle pipeline data
    const pipeline = pipelineResult.success && pipelineResult.data ? pipelineResult.data : [];
    const totalRevenue = pipeline.reduce((sum, stage) => sum + (stage.totalAmount || 0), 0) / 100;

    // Calculate conversion rate
    const closedWon = pipeline.find((s) => s.stage === 'closed_won');
    const closedLost = pipeline.find((s) => s.stage === 'closed_lost');
    const wonCount = closedWon?.count || 0;
    const lostCount = closedLost?.count || 0;
    const conversionRate = wonCount + lostCount > 0 ? (wonCount / (wonCount + lostCount)) * 100 : 0;

    // Get counts from pagination
    const totalOrders =
      opportunitiesResult.success && 'pagination' in opportunitiesResult
        ? (opportunitiesResult as { pagination: { total: number } }).pagination?.total || 0
        : 0;
    const newCustomers =
      contactsResult.success && 'pagination' in contactsResult
        ? (contactsResult as { pagination: { total: number } }).pagination?.total || 0
        : 0;

    // Build revenue breakdown
    const revenueBreakdown = pipeline
      .filter((stage) => stage.totalAmount > 0)
      .map((stage) => ({
        category: formatStageName(stage.stage),
        amount: stage.totalAmount / 100,
        percentage: totalRevenue > 0 ? ((stage.totalAmount / 100) / totalRevenue) * 100 : 0,
      }));

    // Build account map for transaction enrichment
    const accounts: Account[] =
      accountsResult.success && accountsResult.data && 'data' in accountsResult.data
        ? (accountsResult.data as { data: Account[] }).data
        : accountsResult.success && Array.isArray(accountsResult.data)
        ? accountsResult.data
        : [];
    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    // Build recent transactions
    const opportunities: Opportunity[] =
      opportunitiesResult.success && opportunitiesResult.data && 'data' in opportunitiesResult.data
        ? (opportunitiesResult.data as { data: Opportunity[] }).data
        : opportunitiesResult.success && Array.isArray(opportunitiesResult.data)
        ? opportunitiesResult.data
        : [];

    const recentTransactions = opportunities.map((opp) => {
      const account = accountMap.get(opp.accountId);
      return {
        id: opp.id,
        customer: account?.name || 'Unknown',
        product: opp.name,
        status: mapStageToStatus(opp.stage),
        quantity: 1,
        unitPrice: (opp.amount || 0) / 100,
        totalRevenue: (opp.amount || 0) / 100,
        date: opp.createdAt,
      };
    });

    // Get upcoming meetings
    const upcomingMeetings: Meeting[] =
      meetingsResult.success && meetingsResult.data
        ? Array.isArray(meetingsResult.data)
          ? meetingsResult.data
          : []
        : [];

    return {
      totalRevenue,
      totalRevenueChange: 12.5, // TODO: Calculate from historical data
      totalOrders,
      totalOrdersChange: 8.2,
      newCustomers,
      newCustomersChange: 15.3,
      conversionRate: Math.round(conversionRate * 10) / 10,
      conversionRateChange: 2.1,
      revenueBreakdown,
      recentTransactions,
      upcomingMeetings,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
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

function mapStageToStatus(stage: string): 'success' | 'pending' | 'refunded' {
  switch (stage) {
    case 'closed_won':
      return 'success';
    case 'closed_lost':
      return 'refunded';
    default:
      return 'pending';
  }
}

export default async function DashboardPage() {
  const data = await fetchDashboardData();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent data={data} />
    </Suspense>
  );
}

