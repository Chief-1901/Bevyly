'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { OpportunityCard } from './OpportunityCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import type { Opportunity, Account } from '@/lib/api/server';

type Stage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

interface KanbanColumnProps {
  stage: Stage;
  stageLabel: string;
  opportunities: Opportunity[];
  accountsMap: Map<string, Account>;
  isLoading?: boolean;
  draggedOpportunityId?: string | null;
}

const stageBadgeVariant = (stage: Stage): 'success' | 'danger' | 'warning' | 'info' | 'neutral' => {
  switch (stage) {
    case 'closed_won':
      return 'success';
    case 'closed_lost':
      return 'danger';
    case 'negotiation':
    case 'proposal':
      return 'warning';
    default:
      return 'info';
  }
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(amount / 100);
}

export function KanbanColumn({
  stage,
  stageLabel,
  opportunities,
  accountsMap,
  isLoading,
  draggedOpportunityId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const count = opportunities.length;
  const totalAmount = opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);

  // Memoize opportunity IDs to prevent recalculation on every render
  const opportunityIds = useMemo(
    () => opportunities.map((opp) => opp.id),
    [opportunities]
  );

  return (
    <div
      className="flex flex-col w-80 flex-shrink-0"
      data-testid={`kanban-column-${stage}`}
    >
      {/* Column Header */}
      <div className="mb-3 px-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-text-primary">{stageLabel}</h3>
            <Badge variant={stageBadgeVariant(stage)} size="sm">
              {count}
            </Badge>
          </div>
        </div>
        {totalAmount > 0 && (
          <div className="text-xs font-medium text-text-muted">
            {formatCurrency(totalAmount)}
          </div>
        )}
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-2 rounded-lg min-h-[600px] transition-colors
          ${isOver ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500' : 'bg-surface-secondary'}
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <SortableContext items={opportunityIds} strategy={verticalListSortingStrategy}>
          {opportunities.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <EmptyState
                icon={<CurrencyDollarIcon className="h-8 w-8" />}
                title="No opportunities"
                description={`Drag opportunities here to move them to ${stageLabel}`}
                className="py-4"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  account={accountsMap.get(opp.accountId)}
                  isDragging={draggedOpportunityId === opp.id}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
