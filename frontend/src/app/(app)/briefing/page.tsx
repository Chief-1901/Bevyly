import { Suspense } from 'react';
import { intentApi, opportunitiesApi } from '@/lib/api/server';
import { BriefingContent } from './BriefingContent';
import { BriefingSkeleton } from './BriefingSkeleton';

async function BriefingData() {
  // Fetch briefing and pipeline data in parallel
  const [briefingResult, pipelineResult] = await Promise.all([
    intentApi.getBriefing(10),
    opportunitiesApi.getPipeline(),
  ]);

  if (!briefingResult.success || !briefingResult.data) {
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
        pipelineStages={[]}
        error="Failed to load briefing. Please try again."
      />
    );
  }

  return (
    <BriefingContent
      recommendations={briefingResult.data.recommendations}
      signals={briefingResult.data.signals}
      summary={briefingResult.data.summary}
      pipelineStages={pipelineResult.success && pipelineResult.data ? pipelineResult.data : []}
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
