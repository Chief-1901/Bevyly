/**
 * Sample/fallback data for dashboard charts
 * Used when API is unavailable or for static data like heatmap values
 */

// ─────────────────────────────────────────────────────────────
// Heatmap data for Sales Trend chart
// ─────────────────────────────────────────────────────────────

export interface HeatmapDataPoint {
  month: string;
  week: number;
  newUsers: number;
  existingUsers: number;
  intensity: number; // 0-5 scale for color
}

function generateHeatmapData(): HeatmapDataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data: HeatmapDataPoint[] = [];

  for (let m = 0; m < 12; m++) {
    for (let w = 1; w <= 4; w++) {
      // Generate somewhat realistic data with seasonality
      const baseLine = 50 + Math.sin((m / 12) * Math.PI * 2) * 30;
      const randomFactor = Math.random() * 40;
      const newUsers = Math.round(baseLine + randomFactor);
      const existingUsers = Math.round(baseLine * 1.5 + randomFactor * 0.5);
      const total = newUsers + existingUsers;
      const intensity = Math.min(5, Math.floor(total / 40));

      data.push({
        month: months[m],
        week: w,
        newUsers,
        existingUsers,
        intensity,
      });
    }
  }

  return data;
}

export const heatmapData = generateHeatmapData();

// ─────────────────────────────────────────────────────────────
// Sparkline data for KPI cards
// ─────────────────────────────────────────────────────────────

export interface SparklinePoint {
  value: number;
}

function generateSparklineData(baseValue: number, volatility: number): SparklinePoint[] {
  const points: SparklinePoint[] = [];
  let current = baseValue;

  for (let i = 0; i < 12; i++) {
    current = current + (Math.random() - 0.4) * volatility;
    current = Math.max(0, current);
    points.push({ value: Math.round(current) });
  }

  return points;
}

export const revenueSparkline = generateSparklineData(100000, 15000);
export const ordersSparkline = generateSparklineData(150, 20);
export const customersSparkline = generateSparklineData(80, 10);
export const conversionSparkline = generateSparklineData(65, 5);

// ─────────────────────────────────────────────────────────────
// Fallback transactions data
// ─────────────────────────────────────────────────────────────

export interface FallbackTransaction {
  id: string;
  customer: string;
  product: string;
  status: 'success' | 'pending' | 'refunded';
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  date: string;
}

export const fallbackTransactions: FallbackTransaction[] = [
  {
    id: 'TRX-001',
    customer: 'Acme Corporation',
    product: 'Enterprise License',
    status: 'success',
    quantity: 1,
    unitPrice: 12000,
    totalRevenue: 12000,
    date: '2026-01-03T10:30:00Z',
  },
  {
    id: 'TRX-002',
    customer: 'Globex Inc',
    product: 'Team Plan',
    status: 'pending',
    quantity: 5,
    unitPrice: 500,
    totalRevenue: 2500,
    date: '2026-01-02T14:15:00Z',
  },
  {
    id: 'TRX-003',
    customer: 'Initech',
    product: 'Starter Kit',
    status: 'success',
    quantity: 10,
    unitPrice: 99,
    totalRevenue: 990,
    date: '2026-01-02T09:00:00Z',
  },
  {
    id: 'TRX-004',
    customer: 'Umbrella Corp',
    product: 'Premium Support',
    status: 'refunded',
    quantity: 1,
    unitPrice: 5000,
    totalRevenue: 5000,
    date: '2026-01-01T16:45:00Z',
  },
  {
    id: 'TRX-005',
    customer: 'Wayne Enterprises',
    product: 'Custom Integration',
    status: 'success',
    quantity: 1,
    unitPrice: 25000,
    totalRevenue: 25000,
    date: '2026-01-01T11:20:00Z',
  },
  {
    id: 'TRX-006',
    customer: 'Stark Industries',
    product: 'Enterprise License',
    status: 'pending',
    quantity: 3,
    unitPrice: 12000,
    totalRevenue: 36000,
    date: '2025-12-31T08:30:00Z',
  },
];

// ─────────────────────────────────────────────────────────────
// Revenue breakdown fallback
// ─────────────────────────────────────────────────────────────

export interface RevenueCategory {
  category: string;
  amount: number;
  percentage: number;
}

export const fallbackRevenueBreakdown: RevenueCategory[] = [
  { category: 'Closed Won', amount: 245000, percentage: 45 },
  { category: 'Negotiation', amount: 120000, percentage: 22 },
  { category: 'Proposal', amount: 89000, percentage: 16 },
  { category: 'Qualification', amount: 56000, percentage: 10 },
  { category: 'Prospecting', amount: 38000, percentage: 7 },
];

