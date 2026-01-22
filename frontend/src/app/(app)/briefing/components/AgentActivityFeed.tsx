'use client';

import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowRightIcon, CpuChipIcon } from '@heroicons/react/24/outline';

export function AgentActivityFeed() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Agent Activity</h2>
          <span
            className="text-sm text-text-muted flex items-center gap-1 cursor-not-allowed opacity-50"
            aria-label="View All Agents (coming soon)"
          >
            View All Agents
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary-500/10 flex items-center justify-center">
              <CpuChipIcon className="h-8 w-8 text-primary-500" aria-hidden="true" />
            </div>
          </div>

          <h3 className="text-lg font-medium text-text-primary mb-2">Coming Soon</h3>
          <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
            AI agents will appear here once configured. Automate your sales workflows with intelligent agents.
          </p>

          <div className="space-y-2 text-left max-w-md mx-auto mb-6">
            <p className="text-sm text-text-secondary"><strong>Agents will:</strong></p>
            <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
              <li>Source new leads automatically from Apollo.io and other platforms</li>
              <li>Enrich contact information with company data</li>
              <li>Draft personalized emails using AI</li>
              <li>Score and prioritize opportunities based on engagement</li>
              <li>Monitor deal health and alert you to risks</li>
            </ul>
          </div>

          <Button
            variant="secondary"
            size="sm"
            disabled
            title="Agent configuration will be available in Phase 2"
          >
            Configure Agents (Coming Soon)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
