import { Card } from '@/components/ui/Card';
import clsx from 'clsx';
import type { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    isPositive: boolean;
  };
  sparkline?: ReactNode;
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  sparkline,
  className,
}: KPICardProps) {
  return (
    <Card
      className={clsx('flex items-center justify-between h-24', className)}
      padding="kpi"
      hover
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted mb-1">
          {title}
        </p>
        <p className="text-xl font-semibold text-primary-700 truncate">{value}</p>
        {change && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className={clsx(
                'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
                change.isPositive
                  ? 'bg-success-a12 text-success'
                  : 'bg-danger-a10 text-danger'
              )}
            >
              {change.isPositive ? '↑' : '↓'} {Math.abs(change.value).toFixed(2)}%
            </span>
            <span className="text-xs text-text-muted">vs last year</span>
          </div>
        )}
      </div>
      {sparkline && (
        <div className="ml-4 w-20 h-12 flex-shrink-0">
          {sparkline}
        </div>
      )}
    </Card>
  );
}

export default KPICard;
