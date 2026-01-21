import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  opportunitiesApi,
  accountsApi,
  activitiesApi,
  type Opportunity,
  type Account,
  type Activity,
} from '@/lib/api/server';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ContextualSidebar } from '@/components/intent';
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  PencilIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';

async function fetchOpportunityDetails(id: string) {
  const [opportunityResult, accountsListResult] = await Promise.all([
    opportunitiesApi.get(id),
    accountsApi.list({ limit: 100 }),
  ]);

  if (!opportunityResult.success || !opportunityResult.data) {
    return null;
  }

  const opportunity = opportunityResult.data as Opportunity;
  const accounts = (accountsListResult.success && accountsListResult.data ? accountsListResult.data : []) as Account[];
  const account = accounts.find(a => a.id === opportunity.accountId);

  // Fetch activities for this opportunity (if the API supports it)
  let activities: Activity[] = [];
  if (account) {
    const timelineResult = await activitiesApi.getAccountTimeline(account.id);
    activities = (timelineResult.success && timelineResult.data?.data ? timelineResult.data.data : []) as Activity[];
  }

  return {
    opportunity,
    account,
    activities,
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const stageBadgeVariant = (stage: string) => {
  switch (stage) {
    case 'closed_won':
      return 'success';
    case 'closed_lost':
      return 'danger';
    case 'negotiation':
    case 'proposal':
      return 'warning';
    default:
      return 'info';
  }
};

const stageLabels: Record<string, string> = {
  prospecting: 'Prospecting',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  closed_won: 'Closed Won',
  closed_lost: 'Closed Lost',
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchOpportunityDetails(id);

  if (!data) {
    notFound();
  }

  const { opportunity, account, activities } = data;

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/opportunities"
              className="mt-1 p-2 -ml-2 text-text-muted hover:text-text-primary rounded-md hover:bg-gray-100 dark:hover:bg-gray-300"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-text-primary">
                  {opportunity.name}
                </h1>
                <Badge variant={stageBadgeVariant(opportunity.stage)}>
                  {stageLabels[opportunity.stage] || opportunity.stage}
                </Badge>
              </div>
              {account && (
                <Link
                  href={`/accounts/${account.id}`}
                  className="text-text-muted hover:text-primary-700 mt-1 inline-block"
                >
                  {account.name}
                </Link>
              )}
            </div>
          </div>
          <Link href={`/opportunities/${id}/edit`}>
            <Button variant="secondary" leftIcon={<PencilIcon className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-success/20 flex items-center justify-center">
                <CurrencyDollarIcon className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Amount</p>
                <p className="text-xl font-bold text-text-primary">
                  {opportunity.amount ? formatCurrency(opportunity.amount) : '-'}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-info/20 flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Probability</p>
                <p className="text-xl font-bold text-text-primary">{opportunity.probability}%</p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-warning/20 flex items-center justify-center">
                <CalendarDaysIcon className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Close Date</p>
                <p className="text-xl font-bold text-text-primary">
                  {formatDate(opportunity.closeDate)}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-secondary-500/20 flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-secondary-700 dark:text-secondary-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Created</p>
                <p className="text-xl font-bold text-text-primary">
                  {formatDate(opportunity.createdAt)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opportunity Details */}
          <Card padding="lg">
            <CardHeader>Details</CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {opportunity.description && (
                  <div>
                    <dt className="text-sm text-text-muted mb-1">Description</dt>
                    <dd className="text-text-primary">{opportunity.description}</dd>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Account</dt>
                    <dd className="text-text-primary">
                      {account ? (
                        <Link
                          href={`/accounts/${account.id}`}
                          className="hover:text-primary-700"
                        >
                          {account.name}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Owner</dt>
                    <dd className="text-text-primary">{opportunity.ownerId || '-'}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CurrencyDollarIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Currency</dt>
                    <dd className="text-text-primary">{opportunity.currency}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card padding="lg">
            <CardHeader>Recent Activity</CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-10 w-10 text-text-muted mx-auto mb-3" />
                  <p className="text-sm text-text-muted">No activities yet</p>
                  <p className="text-xs text-text-muted mt-1">
                    Activities will appear here as you engage with this opportunity
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {activities.slice(0, 5).map((activity) => (
                    <li key={activity.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-300 flex items-center justify-center flex-shrink-0">
                        {activity.type === 'email' ? (
                          <EnvelopeIcon className="h-4 w-4 text-text-muted" />
                        ) : activity.type === 'call' ? (
                          <PhoneIcon className="h-4 w-4 text-text-muted" />
                        ) : (
                          <CalendarIcon className="h-4 w-4 text-text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {activity.description || activity.type}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatDate(activity.occurredAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contextual Sidebar - Desktop only */}
      <div className="hidden xl:block">
        <ContextualSidebar
          entityType="opportunity"
          entityId={id}
          entityName={opportunity.name}
        />
      </div>
    </div>
  );
}
