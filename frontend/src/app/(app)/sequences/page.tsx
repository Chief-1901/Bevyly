import { Suspense } from 'react';
import { sequencesApi, type Sequence } from '@/lib/api/server';
import { SequencesContent } from './SequencesContent';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  status?: string;
}

async function fetchSequences(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const params: Record<string, string | number> = { page, limit: 10 };
  if (searchParams.status) params.status = searchParams.status;

  const result = await sequencesApi.list(params);

  if (!result.success || !result.data) {
    return { sequences: [], pagination: null };
  }

  return {
    sequences: result.data.data || [],
    pagination: result.data.pagination || null,
  };
}

export default async function SequencesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { sequences, pagination } = await fetchSequences(params);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <SequencesContent
        sequences={sequences}
        pagination={pagination}
        currentStatus={params.status || ''}
      />
    </Suspense>
  );
}

