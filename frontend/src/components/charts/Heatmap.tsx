'use client';

import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';
import clsx from 'clsx';

interface HeatmapDataPoint {
  month: string;
  week: number;
  newUsers: number;
  existingUsers: number;
  intensity: number;
}

interface HeatmapProps {
  data: HeatmapDataPoint[];
  className?: string;
}

// Map intensity levels to CSS variable token names
const intensityColors = [
  'var(--heatmap-0)',
  'var(--heatmap-1)',
  'var(--heatmap-2)',
  'var(--heatmap-3)',
  'var(--heatmap-4)',
  'var(--heatmap-5)',
];

export function Heatmap({ data, className }: HeatmapProps) {
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const months = [...new Set(data.map((d) => d.month))];
  const weeks = [1, 2, 3, 4];

  return (
    <div className={clsx('overflow-x-auto', className)}>
      {/* Grid container */}
      <div className="min-w-[500px] relative">
        {/* Month labels */}
        <div className="flex mb-2">
          <div className="w-8" /> {/* Spacer for week labels */}
          {months.map((month) => (
            <div
              key={month}
              className="flex-1 text-center text-xs uppercase tracking-wide text-text-muted"
            >
              {month}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="space-y-0.5">
          {weeks.map((week) => (
            <div key={week} className="flex gap-0.5">
              <div className="w-8 flex items-center justify-end pr-2 text-xs text-text-muted">
                W{week}
              </div>
              {months.map((month) => {
                const cell = data.find(
                  (d) => d.month === month && d.week === week
                );
                if (!cell) return null;

                const total = cell.newUsers + cell.existingUsers;
                const isHovered = hoveredColumn === month;

                return (
                  <Tooltip
                    key={`${month}-${week}`}
                    content={
                      <div className="text-xs">
                        <div className="font-semibold mb-1">
                          {month} Week {week}
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>New Users:</span>
                          <span className="font-medium">{cell.newUsers.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>Existing:</span>
                          <span className="font-medium">{cell.existingUsers.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-gridline mt-1 pt-1">
                          <span>Total:</span>
                          <span className="font-medium">{total.toLocaleString()}</span>
                        </div>
                      </div>
                    }
                    position="top"
                  >
                    <div
                      className={clsx(
                        'flex-1 rounded-sm cursor-pointer',
                        'transition-all duration-120',
                        'hover:ring-2 hover:ring-primary-500 hover:z-10',
                        'focus-visible:ring-2 focus-visible:ring-focus focus-visible:z-10'
                      )}
                      style={{
                        backgroundColor: intensityColors[cell.intensity] || intensityColors[0],
                        width: 'var(--heatmap-cell)',
                        height: 'var(--heatmap-cell)',
                        minWidth: '10px',
                        minHeight: '10px',
                      }}
                      tabIndex={0}
                      role="gridcell"
                      aria-label={`${month} Week ${week}: ${total} total users`}
                      onMouseEnter={() => setHoveredColumn(month)}
                      onMouseLeave={() => setHoveredColumn(null)}
                      onFocus={() => setHoveredColumn(month)}
                      onBlur={() => setHoveredColumn(null)}
                    />
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        {/* Dashed vertical hover line overlay */}
        {hoveredColumn && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `calc(32px + ${months.indexOf(hoveredColumn)} * (100% - 32px) / ${months.length} + (100% - 32px) / ${months.length} / 2)`,
              top: '24px',
              bottom: '0',
              width: '1px',
              borderLeft: '1px dashed var(--color-primary-700)',
            }}
            aria-hidden="true"
          />
        )}

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-text-muted">
          <span>Less</span>
          <div className="flex gap-0.5">
            {intensityColors.map((color, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default Heatmap;
