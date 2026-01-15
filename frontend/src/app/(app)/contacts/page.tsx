import { Suspense } from 'react';
import { contactsApi, type Contact } from '@/lib/api/server';
import { ContactsContent } from './ContactsContent';

export const dynamic = 'force-dynamic';

interface SearchParams {
  page?: string;
  search?: string;
  accountId?: string;
  status?: string;
}

async function fetchContacts(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const params: Record<string, string | number> = { page, limit: 10 };
  if (searchParams.search) params.search = searchParams.search;
  if (searchParams.accountId) params.accountId = searchParams.accountId;
  if (searchParams.status) params.status = searchParams.status;

  const result = await contactsApi.list(params);
  if (!result.success || !result.data) {
    return { contacts: [], pagination: null };
  }
  // The backend returns data directly in result.data, not result.data.data
  return {
    contacts: result.data || [],
    pagination: result.pagination || null,
  };
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { contacts, pagination } = await fetchContacts(params);

  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <ContactsContent
        contacts={contacts}
        pagination={pagination}
        currentSearch={params.search || ''}
      />
    </Suspense>
  );
}

