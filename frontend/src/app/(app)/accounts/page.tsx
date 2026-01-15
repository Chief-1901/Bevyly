import { Suspense } from 'react';
import { accountsApi, type Account } from '@/lib/api/server';
import { AccountsContent } from './AccountsContent';
import { AccountsSkeleton } from './AccountsSkeleton';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
}

async function fetchAccounts(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const params: Record<string, string | number> = {
    page,
    limit: 10,
  };
  if (searchParams.search) params.search = searchParams.search;
  if (searchParams.status) params.status = searchParams.status;

  const result = await accountsApi.list(params);
  
  // Debug logging
  console.log('[Accounts Page] API Result:', {
    success: result.success,
    dataType: Array.isArray(result.data) ? 'array' : typeof result.data,
    dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
    hasPagination: !!result.pagination,
    data: result.data,
    pagination: result.pagination,
  });
  
  // Backend returns { success: true, data: Account[], pagination: {...} }
  // The data field contains the accounts array directly, pagination is at top level
  if (!result.success || !result.data) {
    console.log('[Accounts Page] Returning empty - success:', result.success, 'has data:', !!result.data);
    return { accounts: [], pagination: null };
  }

  const accounts = result.data || [];
  console.log('[Accounts Page] Returning accounts:', accounts.length, 'items');
  
  return {
    accounts,
    pagination: result.pagination || null,
  };
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { accounts, pagination } = await fetchAccounts(params);

  return (
    <Suspense fallback={<AccountsSkeleton />}>
      <AccountsContent
        accounts={accounts}
        pagination={pagination}
        currentSearch={params.search || ''}
        currentStatus={params.status || ''}
      />
    </Suspense>
  );
}

