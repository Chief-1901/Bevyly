'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { ReactNode } from 'react';

export type Priority = 'high' | 'medium' | 'low';

export interface ActionCardAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ActionCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  priority: Priority;
  rationale: string;
  primaryAction: ActionCardAction;
  secondaryAction?: ActionCardAction;
  children?: ReactNode;
  className?: string;
}

const priorityConfig: Record<Priority, { border: string; badge: 'danger' | 'warning' | 'info' }> = {
  high: {
    border: 'border-l-4 border-l-danger-500',
    badge: 'danger',
  },
  medium: {
    border: 'border-l-4 border-l-warning-500',
    badge: 'warning',
  },
  low: {
    border: 'border-l-4 border-l-info-500',
    badge: 'info',
  },
};

export function ActionCard({
  icon,
  title,
  subtitle,
  priority,
  rationale,
  primaryAction,
  secondaryAction,
  children,
  className,
}: ActionCardProps) {
  const config = priorityConfig[priority];

  return (
    <Card className={clsx(config.border, 'p-4', className)}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-surface-primary-a06 flex items-center justify-center text-text-muted">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary truncate">{title}</h3>
            <Badge variant={config.badge} size="sm">
              {priority}
            </Badge>
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>
          )}

          {/* Rationale */}
          <p className="text-sm text-text-secondary mt-2">{rationale}</p>

          {/* Custom content */}
          {children}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            {primaryAction.href ? (
              <Link href={primaryAction.href}>
                <Button size="sm">{primaryAction.label}</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )}

            {secondaryAction && (
              secondaryAction.href ? (
                <Link href={secondaryAction.href}>
                  <Button size="sm" variant="secondary">
                    {secondaryAction.label}
                  </Button>
                </Link>
              ) : (
                <Button size="sm" variant="secondary" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ActionCard;
