import { Suspense } from 'react';
import { opportunitiesApi, accountsApi, type Opportunity, type Account } from '@/lib/api/server';
import { OpportunitiesContent } from './OpportunitiesContent';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  stage?: string;
  search?: string;
}

async function fetchOpportunities(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const params: Record<string, string | number> = { page, limit: 10 };
  if (searchParams.stage) params.stage = searchParams.stage;
  if (searchParams.search) params.search = searchParams.search;

  const [oppResult, accountsResult] = await Promise.all([
    opportunitiesApi.list(params),
    accountsApi.list({ limit: 100 }),
  ]);

  // The backend returns data directly in result.data, not result.data.data
  const opportunities = oppResult.success && oppResult.data ? oppResult.data : [];
  const pagination = oppResult.success && oppResult.pagination ? oppResult.pagination : null;
  const accounts = accountsResult.success && accountsResult.data ? accountsResult.data : [];

  return { opportunities, pagination, accounts };
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { opportunities, pagination, accounts } = await fetchOpportunities(params);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <OpportunitiesContent
        opportunities={opportunities}
        accounts={accounts}
        pagination={pagination}
        currentStage={params.stage || ''}
      />
    </Suspense>
  );
}

