import { Suspense } from 'react';
import { activitiesApi, type Activity } from '@/lib/api/server';
import { ActivitiesContent } from './ActivitiesContent';

export const dynamic = 'force-dynamic';

interface SearchParams {
  type?: string;
  cursor?: string;
}

async function fetchActivities(searchParams: SearchParams) {
  const params: Record<string, string | number> = { limit: 20 };
  if (searchParams.type) params.type = searchParams.type;
  if (searchParams.cursor) params.cursor = searchParams.cursor;

  const result = await activitiesApi.list(params);

  if (!result.success || !result.data) {
    return { activities: [], nextCursor: null };
  }

  return {
    activities: result.data.data || [],
    nextCursor: result.data.nextCursor || null,
  };
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { activities, nextCursor } = await fetchActivities(params);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <ActivitiesContent
        activities={activities}
        nextCursor={nextCursor}
        currentType={params.type || ''}
      />
    </Suspense>
  );
}

