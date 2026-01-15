import clsx from 'clsx';
import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-a10 text-success',
  warning: 'bg-warning-a10 text-warning',
  danger: 'bg-danger-a10 text-danger',
  info: 'bg-info/10 text-info',
  neutral: 'bg-surface-primary-a06 text-gray-600',
};

const sizeClasses = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export function Badge({
  variant = 'neutral',
  children,
  className,
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status-specific badge component for transactions
type StatusType = 'success' | 'pending' | 'refunded';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusVariantMap: Record<StatusType, BadgeVariant> = {
  success: 'success',
  pending: 'warning',
  refunded: 'neutral',
};

const statusLabelMap: Record<StatusType, string> = {
  success: 'Success',
  pending: 'Pending',
  refunded: 'Refunded',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariantMap[status]} className={className}>
      {statusLabelMap[status]}
    </Badge>
  );
}

export default Badge;
