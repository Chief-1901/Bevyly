import { Suspense } from 'react';
import { emailsApi, type Email } from '@/lib/api/server';
import { EmailsContent } from './EmailsContent';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  status?: string;
}

async function fetchEmails(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const params: Record<string, string | number> = { page, limit: 10 };
  if (searchParams.status) params.status = searchParams.status;

  const result = await emailsApi.list(params);

  if (!result.success || !result.data) {
    return { emails: [], pagination: null };
  }

  return {
    emails: result.data.data || [],
    pagination: result.data.pagination || null,
  };
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { emails, pagination } = await fetchEmails(params);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <EmailsContent
        emails={emails}
        pagination={pagination}
        currentStatus={params.status || ''}
      />
    </Suspense>
  );
}

