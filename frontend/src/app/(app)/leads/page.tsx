import { Suspense } from 'react';
import { leadsApi } from '@/lib/api/server';
import { LeadsContent } from './LeadsContent';
import { LeadsSkeleton } from './LeadsSkeleton';

interface LeadsPageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    source?: string;
    campaignId?: string;
    search?: string;
  }>;
}

async function LeadsData({ searchParams }: { searchParams: LeadsPageProps['searchParams'] }) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const status = params.status || '';
  const source = params.source || '';

  const [leadsResult, countsResult] = await Promise.all([
    leadsApi.list({
      page,
      limit: 20,
      ...(status && { status }),
      ...(source && { source }),
      ...(params.campaignId && { campaignId: params.campaignId }),
      ...(params.search && { search: params.search }),
    }),
    leadsApi.getCounts(),
  ]);

  const leads = leadsResult.success ? leadsResult.data || [] : [];
  const pagination = leadsResult.pagination || null;
  const counts = countsResult.success ? countsResult.data || null : null;

  return (
    <LeadsContent
      leads={leads}
      pagination={pagination}
      counts={counts}
      currentStatus={status}
      currentSource={source}
    />
  );
}

export default async function LeadsPage(props: LeadsPageProps) {
  return (
    <Suspense fallback={<LeadsSkeleton />}>
      <LeadsData searchParams={props.searchParams} />
    </Suspense>
  );
}
