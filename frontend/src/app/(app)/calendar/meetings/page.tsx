import { Suspense } from 'react';
import { meetingsApi, type Meeting } from '@/lib/api/server';
import { MeetingsContent } from './MeetingsContent';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  status?: string;
}

async function fetchMeetings(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const params: Record<string, string | number> = { page, limit: 10 };
  if (searchParams.status) params.status = searchParams.status;

  const result = await meetingsApi.list(params);

  if (!result.success || !result.data) {
    return { meetings: [], pagination: null };
  }

  return {
    meetings: result.data.data || [],
    pagination: result.data.pagination || null,
  };
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { meetings, pagination } = await fetchMeetings(params);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <MeetingsContent
        meetings={meetings}
        pagination={pagination}
        currentStatus={params.status || ''}
      />
    </Suspense>
  );
}

