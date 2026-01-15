'use client';

import { Tooltip } from '@/components/ui/Tooltip';
import { formatCurrency } from '@lib/api/dashboard';
import clsx from 'clsx';

interface BarChartDataPoint {
  category: string;
  amount: number;
  percentage: number;
}

interface BarChartMiniProps {
  data: BarChartDataPoint[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

// Color palette using CSS variable tokens
const barColors = [
  'var(--color-secondary-700)',
  'var(--color-secondary-500)',
  'var(--color-secondary-200)',
  'var(--color-gray-400)',
  'var(--color-gray-300)',
];

export function BarChartMini({
  data,
  className,
  orientation = 'horizontal',
}: BarChartMiniProps) {

  if (orientation === 'vertical') {
    const maxAmount = Math.max(...data.map((d) => d.amount));

    return (
      <div className={clsx('flex items-end justify-between gap-2 h-40', className)}>
        {data.map((item, index) => {
          const heightPercent = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
          
          return (
            <Tooltip
              key={item.category}
              content={
                <div className="text-xs">
                  <div className="font-semibold">{item.category}</div>
                  <div>{formatCurrency(item.amount)}</div>
                  <div className="text-text-muted">{item.percentage.toFixed(1)}%</div>
                </div>
              }
              position="top"
            >
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={clsx(
                    'w-full rounded-t-sm',
                    'transition-all duration-160',
                    'hover:opacity-80 cursor-pointer',
                    'focus-visible:ring-2 focus-visible:ring-focus'
                  )}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: 4,
                    backgroundColor: barColors[index % barColors.length],
                  }}
                  tabIndex={0}
                  role="img"
                  aria-label={`${item.category}: ${formatCurrency(item.amount)}`}
                />
                <span className="text-xs text-text-muted truncate max-w-full">
                  {item.category.split(' ')[0]}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // Horizontal bars
  return (
    <div className={clsx('space-y-3', className)}>
      {data.map((item, index) => (
        <div key={item.category}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-primary">{item.category}</span>
            <span className="text-text-muted">{formatCurrency(item.amount)}</span>
          </div>
          <Tooltip
            content={
              <div className="text-xs">
                <div className="font-semibold">{item.category}</div>
                <div>{formatCurrency(item.amount)}</div>
                <div className="text-text-muted">{item.percentage.toFixed(1)}% of total</div>
              </div>
            }
            position="top"
          >
            <div
              className="h-2 w-full bg-surface-primary-a06 rounded-full overflow-hidden cursor-pointer"
              tabIndex={0}
              role="progressbar"
              aria-valuenow={item.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.category}: ${item.percentage.toFixed(1)}%`}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${item.percentage}%`,
                  backgroundColor: barColors[index % barColors.length],
                }}
              />
            </div>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

export default BarChartMini;
