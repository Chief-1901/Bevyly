/**
 * Dashboard data aggregation
 * Computes KPIs and prepares data for dashboard display
 */

import {
  listAccounts,
  listContacts,
  listOpportunities,
  getPipelineSummary,
  type Opportunity,
  type Account,
  type PipelineSummary,
} from './endpoints';

export interface DashboardKPIs {
  totalRevenue: number;
  totalRevenueChange: number;
  totalOrders: number;
  totalOrdersChange: number;
  newCustomers: number;
  newCustomersChange: number;
  conversionRate: number;
  conversionRateChange: number;
}

export interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface Transaction {
  id: string;
  customer: string;
  product: string;
  status: 'success' | 'pending' | 'refunded';
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  date: string;
}

/**
 * Fetch and compute dashboard KPIs
 */
export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  try {
    const [pipelineData, contactsData, opportunitiesData] = await Promise.all([
      getPipelineSummary(),
      listContacts({ limit: 1 }), // Just to get total count
      listOpportunities({ limit: 1 }),
    ]);

    // Calculate total revenue from all stages
    const totalRevenue = pipelineData.reduce((sum, stage) => sum + stage.totalAmount, 0);

    // Calculate conversion rate
    const closedWon = pipelineData.find((s) => s.stage === 'closed_won');
    const closedLost = pipelineData.find((s) => s.stage === 'closed_lost');
    const wonCount = closedWon?.count || 0;
    const lostCount = closedLost?.count || 0;
    const conversionRate = wonCount + lostCount > 0
      ? (wonCount / (wonCount + lostCount)) * 100
      : 0;

    return {
      totalRevenue: totalRevenue / 100, // Convert from cents
      totalRevenueChange: 12.5, // Placeholder - would need historical data
      totalOrders: opportunitiesData.pagination?.total || 0,
      totalOrdersChange: 8.2,
      newCustomers: contactsData.pagination?.total || 0,
      newCustomersChange: 15.3,
      conversionRate: Math.round(conversionRate * 10) / 10,
      conversionRateChange: 2.1,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard KPIs:', error);
    // Return fallback data
    return {
      totalRevenue: 0,
      totalRevenueChange: 0,
      totalOrders: 0,
      totalOrdersChange: 0,
      newCustomers: 0,
      newCustomersChange: 0,
      conversionRate: 0,
      conversionRateChange: 0,
    };
  }
}

/**
 * Fetch revenue breakdown by category/stage
 */
export async function fetchRevenueBreakdown(): Promise<RevenueBreakdown[]> {
  try {
    const pipelineData = await getPipelineSummary();
    const totalRevenue = pipelineData.reduce((sum, stage) => sum + stage.totalAmount, 0);

    return pipelineData
      .filter((stage) => stage.totalAmount > 0)
      .map((stage) => ({
        category: formatStageName(stage.stage),
        amount: stage.totalAmount / 100,
        percentage: totalRevenue > 0 ? (stage.totalAmount / totalRevenue) * 100 : 0,
      }));
  } catch (error) {
    console.error('Failed to fetch revenue breakdown:', error);
    return [];
  }
}

/**
 * Fetch recent transactions (opportunities as transactions)
 */
export async function fetchRecentTransactions(): Promise<Transaction[]> {
  try {
    const [opportunitiesData, accountsData] = await Promise.all([
      listOpportunities({ limit: 10 }),
      listAccounts({ limit: 100 }), // Get accounts for customer names
    ]);

    const accountMap = new Map(accountsData.data.map((a) => [a.id, a]));

    return opportunitiesData.data.map((opp) => {
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
  } catch (error) {
    console.error('Failed to fetch recent transactions:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

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

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format large numbers with abbreviations
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

