'use client';

import { Badge } from '@/components/ui/Badge';
import type { HealthScoreResult } from '@/lib/utils/healthScore';

interface HealthScoreIndicatorProps {
  healthScore: HealthScoreResult;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
}

export function HealthScoreIndicator({
  healthScore,
  size = 'md',
  showLabel = true,
  showTooltip = true,
}: HealthScoreIndicatorProps) {
  const { score, color, label, description, factors } = healthScore;

  // Size configurations
  const sizeConfig = {
    sm: { circle: 60, stroke: 4, text: 'text-lg' },
    md: { circle: 80, stroke: 6, text: 'text-2xl' },
    lg: { circle: 120, stroke: 8, text: 'text-4xl' },
  };

  const config = sizeConfig[size];
  const radius = (config.circle - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Color configurations
  const colorConfig = {
    success: {
      stroke: 'stroke-success',
      text: 'text-success',
      bg: 'bg-success/10',
    },
    warning: {
      stroke: 'stroke-warning',
      text: 'text-warning',
      bg: 'bg-warning/10',
    },
    danger: {
      stroke: 'stroke-danger',
      text: 'text-danger',
      bg: 'bg-danger/10',
    },
  };

  const colors = colorConfig[color];

  return (
    <div className="flex flex-col items-center gap-3" data-testid="health-score-indicator">
      {/* Circular Progress */}
      <div className="relative" title={showTooltip ? description : undefined}>
        <svg width={config.circle} height={config.circle} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={config.circle / 2}
            cy={config.circle / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={config.stroke}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={config.circle / 2}
            cy={config.circle / 2}
            r={radius}
            strokeWidth={config.stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${colors.stroke} transition-all duration-500`}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${config.text} font-bold ${colors.text}`}>
            {score}
          </span>
        </div>
      </div>

      {/* Label and Badge */}
      {showLabel && (
        <div className="flex flex-col items-center gap-1">
          <Badge variant={color} size="md">
            {label}
          </Badge>
          <p className="text-xs text-text-muted text-center max-w-[150px]">
            {description}
          </p>
        </div>
      )}

      {/* Tooltip/Factors Breakdown */}
      {showTooltip && (
        <div className="mt-2 p-3 bg-surface-secondary rounded-lg text-xs space-y-1.5 w-full max-w-[200px]">
          <div className="flex justify-between">
            <span className="text-text-muted">Engagement:</span>
            <span className="text-text-primary font-medium">
              {factors.engagement}/40
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Opportunities:</span>
            <span className="text-text-primary font-medium">
              {factors.opportunities}/30
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Contacts:</span>
            <span className="text-text-primary font-medium">
              {factors.contacts}/20
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Response Rate:</span>
            <span className="text-text-primary font-medium">
              {factors.responseRate}/10
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
