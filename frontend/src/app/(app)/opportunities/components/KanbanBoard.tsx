'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { OpportunityCard } from './OpportunityCard';
import type { Opportunity, Account } from '@/lib/api/server';

type Stage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

interface KanbanBoardProps {
  opportunities: Opportunity[];
  accounts: Account[];
  onStageChange: (oppId: string, newStage: Stage) => Promise<void>;
}

const STAGES: Array<{ value: Stage; label: string }> = [
  { value: 'prospecting', label: 'Prospecting' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

export function KanbanBoard({ opportunities, accounts, onStageChange }: KanbanBoardProps) {
  const [localOpportunities, setLocalOpportunities] = useState(opportunities);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sync local opportunities with prop changes
  useEffect(() => {
    setLocalOpportunities(opportunities);
  }, [opportunities]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  // Memoize accounts map to prevent recreation on every render
  const accountsMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

  // Memoize opportunities grouped by stage
  const opportunitiesByStage = useMemo(
    () => STAGES.reduce((acc, { value }) => {
      acc[value] = localOpportunities.filter((opp) => opp.stage === value);
      return acc;
    }, {} as Record<Stage, Opportunity[]>),
    [localOpportunities]
  );

  const activeOpportunity = activeId
    ? localOpportunities.find((opp) => opp.id === activeId)
    : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) return;

    const opportunityId = active.id as string;
    const newStage = over.id as Stage;

    const opportunity = localOpportunities.find((opp) => opp.id === opportunityId);

    if (!opportunity || opportunity.stage === newStage) {
      return;
    }

    // Optimistic update
    const previousOpportunities = [...localOpportunities];
    setLocalOpportunities((prev) =>
      prev.map((opp) =>
        opp.id === opportunityId ? { ...opp, stage: newStage } : opp
      )
    );

    try {
      await onStageChange(opportunityId, newStage);
    } catch (error) {
      // Revert on error
      console.error('Failed to update stage:', error);
      setLocalOpportunities(previousOpportunities);
    }
  };

  return (
    <div data-testid="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(({ value, label }) => (
            <KanbanColumn
              key={value}
              stage={value}
              stageLabel={label}
              opportunities={opportunitiesByStage[value]}
              accountsMap={accountsMap}
              isLoading={false}
              draggedOpportunityId={activeId}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOpportunity && (
            <div className="rotate-3 scale-105">
              <OpportunityCard
                opportunity={activeOpportunity}
                account={accountsMap.get(activeOpportunity.accountId)}
                isDragging={true}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
