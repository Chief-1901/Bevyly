import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  accountsApi,
  activitiesApi,
  type Account,
  type Contact,
  type Opportunity,
  type Activity,
} from '@/lib/api/server';
import { Badge } from '@/components/ui/Badge';
import { ContextualSidebar } from '@/components/intent';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { calculateHealthScore } from '@/lib/utils/healthScore';
import { AccountDetailContent } from './AccountDetailContent';

export const dynamic = 'force-dynamic';

async function fetchAccountDetails(id: string) {
  const [accountResult, contactsResult, opportunitiesResult, timelineResult] = await Promise.all([
    accountsApi.get(id),
    accountsApi.getContacts(id),
    accountsApi.getOpportunities(id),
    activitiesApi.getAccountTimeline(id),
  ]);

  if (!accountResult.success || !accountResult.data) {
    return null;
  }

  return {
    account: accountResult.data as Account,
    contacts: (contactsResult.success && contactsResult.data ? contactsResult.data : []) as Contact[],
    opportunities: (opportunitiesResult.success && opportunitiesResult.data ? opportunitiesResult.data : []) as Opportunity[],
    activities: (timelineResult.success && timelineResult.data?.data ? timelineResult.data.data : []) as Activity[],
  };
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchAccountDetails(id);

  if (!data) {
    notFound();
  }

  const { account, contacts, opportunities, activities } = data;

  // Calculate health score
  const healthScore = calculateHealthScore({
    activities,
    opportunities,
    contacts,
  });

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/accounts"
              className="mt-1 p-2 -ml-2 text-text-muted hover:text-text-primary rounded-md hover:bg-gray-100 dark:hover:bg-gray-300"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-text-primary">
                  {account.name}
                </h1>
                <Badge
                  variant={
                    account.status === 'active'
                      ? 'success'
                      : account.status === 'prospect'
                      ? 'info'
                      : 'neutral'
                  }
                >
                  {account.status}
                </Badge>
              </div>
              {account.domain && (
                <p className="text-text-muted mt-1">{account.domain}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Detail Content (Client Component) */}
        <AccountDetailContent
          account={account}
          contacts={contacts}
          opportunities={opportunities}
          activities={activities}
          healthScore={healthScore}
          onRefresh={async () => {
            'use server';
            revalidatePath(`/accounts/${id}`);
          }}
        />
      </div>

      {/* Contextual Sidebar - Desktop only */}
      <div className="hidden xl:block">
        <ContextualSidebar
          entityType="account"
          entityId={id}
          entityName={account.name}
        />
      </div>
    </div>
  );
}
