'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Badge } from '@/components/ui/Badge';
import { BarChartMini } from '@/components/charts/BarChartMini';
import { Heatmap } from '@/components/charts/Heatmap';
import { heatmapData } from '@data/dashboard.sample';
import type { AnalyticsData } from './page';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  FunnelIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';

type TimeRange = 'weekly' | 'monthly' | 'yearly';

const timeRangeOptions = [
  { value: 'weekly' as TimeRange, label: 'Weekly' },
  { value: 'monthly' as TimeRange, label: 'Monthly' },
  { value: 'yearly' as TimeRange, label: 'Yearly' },
];

interface AnalyticsContentProps {
  data: AnalyticsData | null;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
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

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; isPositive: boolean };
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
}) {
  const colorMap = {
    primary: 'bg-primary-500/10 text-primary-500',
    secondary: 'bg-secondary-500/10 text-secondary-700 dark:text-secondary-500',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/10 text-warning',
    info: 'bg-info/10 text-info',
  };

  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${
                trend.isPositive ? 'text-success' : 'text-danger'
              }`}
            >
              {trend.isPositive ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
}

export function AnalyticsContent({ data }: AnalyticsContentProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');

  // Default empty data
  const analytics = data || {
    pipelineStages: [],
    totalPipeline: 0,
    avgDealSize: 0,
    wonDeals: 0,
    lostDeals: 0,
    winRate: 0,
    totalLeads: 0,
    leadsByStatus: [],
    conversionRate: 0,
    totalAccounts: 0,
    totalContacts: 0,
    activeSequences: 0,
    revenueByStage: [],
    leadsOverTime: [],
    opportunitiesOverTime: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-muted mt-1">
            Track performance and gain insights
          </p>
        </div>
        <SegmentedControl
          options={timeRangeOptions}
          value={timeRange}
          onChange={setTimeRange}
        />
      </div>

      {/* Pipeline Overview */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-primary-500" />
          Pipeline Overview
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Pipeline"
            value={formatCurrency(analytics.totalPipeline)}
            subtitle={`${analytics.pipelineStages.reduce((sum, s) => sum + s.count, 0)} deals`}
            icon={CurrencyDollarIcon}
            color="success"
          />
          <StatCard
            title="Avg. Deal Size"
            value={formatCurrency(analytics.avgDealSize)}
            icon={ChartBarIcon}
            color="info"
          />
          <StatCard
            title="Win Rate"
            value={formatPercentage(analytics.winRate)}
            subtitle={`${analytics.wonDeals} won / ${analytics.lostDeals} lost`}
            icon={TrophyIcon}
            color={analytics.winRate >= 30 ? 'success' : 'warning'}
          />
          <StatCard
            title="Active Sequences"
            value={analytics.activeSequences}
            icon={RectangleStackIcon}
            color="secondary"
          />
        </div>
      </section>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Stage */}
        <Card padding="lg">
          <CardHeader>Revenue by Stage</CardHeader>
          <CardContent>
            {analytics.revenueByStage.length > 0 ? (
              <BarChartMini data={analytics.revenueByStage} orientation="horizontal" />
            ) : (
              <div className="text-center py-12 text-text-muted">
                <ChartBarIcon className="h-10 w-10 mx-auto mb-3" />
                <p className="text-sm">No revenue data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Trend Heatmap */}
        <Card padding="lg">
          <CardHeader>Sales Activity Heatmap</CardHeader>
          <CardContent>
            <Heatmap data={heatmapData} />
          </CardContent>
        </Card>
      </div>

      {/* Leads & Contacts */}
      <section>
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-secondary-700 dark:text-secondary-500" />
          Leads & Contacts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Leads"
            value={analytics.totalLeads}
            icon={UserGroupIcon}
            color="primary"
          />
          <StatCard
            title="Lead Conversion"
            value={formatPercentage(analytics.conversionRate)}
            icon={ArrowTrendingUpIcon}
            color={analytics.conversionRate >= 20 ? 'success' : 'warning'}
          />
          <StatCard
            title="Total Contacts"
            value={analytics.totalContacts}
            icon={EnvelopeIcon}
            color="info"
          />
          <StatCard
            title="Accounts"
            value={analytics.totalAccounts}
            icon={BuildingOfficeIcon}
            color="secondary"
          />
        </div>
      </section>

      {/* Pipeline Stages Table */}
      <Card padding="none">
        <div className="p-4 border-b border-gridline">
          <h2 className="text-lg font-semibold text-text-primary">
            Pipeline Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gridline bg-surface-primary-a06">
                <th className="text-left py-3 px-4 text-sm font-medium text-text-muted">
                  Stage
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Deals
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted">
                  Value
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-text-muted hidden sm:table-cell">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {analytics.pipelineStages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-text-muted">
                    No pipeline data available
                  </td>
                </tr>
              ) : (
                analytics.pipelineStages.map((stage, index) => (
                  <tr
                    key={stage.stage}
                    className={index < analytics.pipelineStages.length - 1 ? 'border-b border-gridline' : ''}
                  >
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          stage.stage === 'Closed Won'
                            ? 'success'
                            : stage.stage === 'Closed Lost'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {stage.stage}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-text-primary font-medium">
                      {stage.count}
                    </td>
                    <td className="py-3 px-4 text-right text-text-primary font-medium">
                      {formatCurrency(stage.amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted hidden sm:table-cell">
                      {analytics.totalPipeline > 0
                        ? formatPercentage((stage.amount / analytics.totalPipeline) * 100)
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Lead Status Breakdown */}
      {analytics.leadsByStatus.length > 0 && (
        <Card padding="none">
          <div className="p-4 border-b border-gridline">
            <h2 className="text-lg font-semibold text-text-primary">
              Lead Status Distribution
            </h2>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {analytics.leadsByStatus.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-primary-a06"
                >
                  <span className="text-sm font-medium text-text-primary">
                    {item.status}
                  </span>
                  <Badge variant="neutral">{item.count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
