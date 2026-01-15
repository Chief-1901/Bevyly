'use client';

interface SparklinePoint {
  value: number;
}

interface SparklineChartProps {
  data: SparklinePoint[];
  className?: string;
  color?: 'primary' | 'secondary' | 'success' | 'danger';
  width?: number;
  height?: number;
}

// Map color variants to CSS variable token strings
const colorMap = {
  primary: 'var(--color-secondary-700)',
  secondary: 'var(--color-secondary-500)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
};

export function SparklineChart({
  data,
  className,
  color = 'secondary',
  width = 80,
  height = 48,
}: SparklineChartProps) {
  const strokeColor = colorMap[color];

  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * chartWidth;
    const y = padding + (1 - (value - min) / range) * chartHeight;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Create area path
  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ];
  const areaPathD = `M ${areaPoints.join(' L ')} Z`;

  // Generate unique gradient ID per color to avoid conflicts
  const gradientId = `sparkline-gradient-${color}-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <svg
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label="Sparkline chart showing trend"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPathD}
        fill={`url(#${gradientId})`}
      />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default SparklineChart;
