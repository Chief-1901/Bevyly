'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CurrencyDollarIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import type { Opportunity, Account } from '@/lib/api/server';

interface OpportunityCardProps {
  opportunity: Opportunity;
  account?: Account;
  isDragging?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function OpportunityCard({ opportunity, account, isDragging }: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none"
      data-testid={`opp-card-${opportunity.id}`}
    >
      <Link href={`/opportunities/${opportunity.id}`}>
        <Card
          padding="sm"
          className={`cursor-pointer hover:shadow-md transition-shadow ${
            isDragging ? 'ring-2 ring-primary-500' : ''
          }`}
        >
          {/* Opportunity Name */}
          <div className="mb-2">
            <h4 className="font-semibold text-sm text-text-primary line-clamp-2">
              {opportunity.name}
            </h4>
          </div>

          {/* Account Name */}
          {account && (
            <div className="text-xs text-text-muted mb-3 truncate">
              {account.name}
            </div>
          )}

          {/* Amount */}
          {opportunity.amount && (
            <div className="flex items-center gap-1.5 mb-2">
              <CurrencyDollarIcon className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
              <span className="text-sm font-medium text-text-primary">
                {formatCurrency(opportunity.amount)}
              </span>
            </div>
          )}

          {/* Close Date */}
          <div className="flex items-center gap-1.5 mb-2">
            <CalendarIcon className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <span className="text-xs text-text-muted">
              {formatDate(opportunity.closeDate)}
            </span>
          </div>

          {/* Probability Badge */}
          {opportunity.probability !== null && opportunity.probability !== undefined && (
            <div className="mt-2">
              <Badge
                variant={
                  opportunity.probability >= 75
                    ? 'success'
                    : opportunity.probability >= 50
                    ? 'warning'
                    : 'neutral'
                }
                size="sm"
              >
                {opportunity.probability}% likely
              </Badge>
            </div>
          )}
        </Card>
      </Link>
    </div>
  );
}
