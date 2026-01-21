import { Suspense } from 'react';
import { intentApi } from '@/lib/api/server';
import { BriefingContent } from './BriefingContent';
import { BriefingSkeleton } from './BriefingSkeleton';

async function BriefingData() {
  const result = await intentApi.getBriefing(10);

  if (!result.success || !result.data) {
    return (
      <BriefingContent
        recommendations={[]}
        signals={[]}
        summary={{
          totalSignals: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
        }}
        error="Failed to load briefing. Please try again."
      />
    );
  }

  return (
    <BriefingContent
      recommendations={result.data.recommendations}
      signals={result.data.signals}
      summary={result.data.summary}
    />
  );
}

export default async function BriefingPage() {
  return (
    <Suspense fallback={<BriefingSkeleton />}>
      <BriefingData />
    </Suspense>
  );
}
