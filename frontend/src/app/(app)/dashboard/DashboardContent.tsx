'use client';

import { useState } from 'react';
import { KPICard } from '@/components/dashboard/KPICard';
import { TransactionsTable } from '@/components/dashboard/TransactionsTable';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Heatmap } from '@/components/charts/Heatmap';
import { BarChartMini } from '@/components/charts/BarChartMini';
import { SparklineChart } from '@/components/charts/SparklineChart';
import {
  heatmapData,
  revenueSparkline,
  ordersSparkline,
  customersSparkline,
  conversionSparkline,
  fallbackTransactions,
  fallbackRevenueBreakdown,
} from '@data/dashboard.sample';
import type { Meeting } from '@/lib/api/server';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

type TimeRange = 'weekly' | 'monthly' | 'yearly';

const timeRangeOptions = [
  { value: 'weekly' as TimeRange, label: 'Weekly' },
  { value: 'monthly' as TimeRange, label: 'Monthly' },
  { value: 'yearly' as TimeRange, label: 'Yearly' },
];

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

interface DashboardContentProps {
  data: DashboardData | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function DashboardContent({ data }: DashboardContentProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');

  // Use real data or fallback
  const kpis = data || {
    totalRevenue: 0,
    totalRevenueChange: 0,
    totalOrders: 0,
    totalOrdersChange: 0,
    newCustomers: 0,
    newCustomersChange: 0,
    conversionRate: 0,
    conversionRateChange: 0,
  };

  const revenueBreakdown = data?.revenueBreakdown?.length
    ? data.revenueBreakdown
    : fallbackRevenueBreakdown;

  const transactions = data?.recentTransactions?.length
    ? data.recentTransactions
    : fallbackTransactions;

  const upcomingMeetings = data?.upcomingMeetings || [];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">
            Welcome back! Here's your sales overview.
          </p>
        </div>
        <SegmentedControl
          options={timeRangeOptions}
          value={timeRange}
          onChange={setTimeRange}
        />
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          change={
            kpis.totalRevenueChange
              ? { value: kpis.totalRevenueChange, isPositive: kpis.totalRevenueChange >= 0 }
              : undefined
          }
          sparkline={<SparklineChart data={revenueSparkline} color="secondary" />}
        />
        <KPICard
          title="Total Orders"
          value={kpis.totalOrders.toLocaleString()}
          change={
            kpis.totalOrdersChange
              ? { value: kpis.totalOrdersChange, isPositive: kpis.totalOrdersChange >= 0 }
              : undefined
          }
          sparkline={<SparklineChart data={ordersSparkline} color="primary" />}
        />
        <KPICard
          title="New Customers"
          value={kpis.newCustomers.toLocaleString()}
          change={
            kpis.newCustomersChange
              ? { value: kpis.newCustomersChange, isPositive: kpis.newCustomersChange >= 0 }
              : undefined
          }
          sparkline={<SparklineChart data={customersSparkline} color="success" />}
        />
        <KPICard
          title="Conversion Rate"
          value={formatPercentage(kpis.conversionRate)}
          change={
            kpis.conversionRateChange
              ? { value: kpis.conversionRateChange, isPositive: kpis.conversionRateChange >= 0 }
              : undefined
          }
          sparkline={<SparklineChart data={conversionSparkline} color="primary" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Trend Heatmap */}
        <Card padding="lg">
          <CardHeader>Sales Trend</CardHeader>
          <CardContent>
            <Heatmap data={heatmapData} />
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card padding="lg">
          <CardHeader>Revenue Breakdown</CardHeader>
          <CardContent>
            <BarChartMini data={revenueBreakdown} orientation="horizontal" />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Transactions + Upcoming Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transactions Table */}
        <Card padding="none" className="lg:col-span-2">
          <div className="p-4 border-b border-gridline">
            <h2 className="text-lg font-semibold text-text-primary">
              Recent Transactions
            </h2>
          </div>
          <TransactionsTable transactions={transactions} />
        </Card>

        {/* Upcoming Meetings */}
        <Card padding="md">
          <CardHeader>Upcoming Meetings</CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-10 w-10 text-text-muted mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-text-muted">No upcoming meetings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-start gap-3 p-3 rounded-md bg-surface-primary-a06"
                  >
                    <div className="h-10 w-10 rounded-md bg-secondary-500/20 flex items-center justify-center flex-shrink-0">
                      <CalendarIcon className="h-5 w-5 text-secondary-700" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {meeting.title}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                        <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {new Date(meeting.startTime).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
