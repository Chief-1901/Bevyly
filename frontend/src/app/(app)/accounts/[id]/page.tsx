import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  accountsApi,
  activitiesApi,
  type Account,
  type Contact,
  type Opportunity,
  type Activity,
} from '@/lib/api/server';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  BuildingOfficeIcon,
  GlobeAltIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  PencilIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
  const totalPipeline = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);

  return (
    <div className="space-y-6">
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
        <Link href={`/accounts/${id}/edit`}>
          <Button variant="secondary" leftIcon={<PencilIcon className="h-4 w-4" />}>
            Edit
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-secondary-500/20 flex items-center justify-center">
              <UserGroupIcon className="h-5 w-5 text-secondary-700 dark:text-secondary-500" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Contacts</p>
              <p className="text-xl font-bold text-text-primary">{contacts.length}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-info/20 flex items-center justify-center">
              <CurrencyDollarIcon className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Pipeline</p>
              <p className="text-xl font-bold text-text-primary">{formatCurrency(totalPipeline)}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-warning/20 flex items-center justify-center">
              <BuildingOfficeIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Opportunities</p>
              <p className="text-xl font-bold text-text-primary">{opportunities.length}</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-success/20 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Activities</p>
              <p className="text-xl font-bold text-text-primary">{activities.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Info */}
        <Card padding="lg">
          <CardHeader>Company Info</CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {account.website && (
                <div className="flex items-start gap-3">
                  <GlobeAltIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Website</dt>
                    <dd className="text-text-primary">
                      <a
                        href={account.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary-700"
                      >
                        {account.website}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {account.industry && (
                <div className="flex items-start gap-3">
                  <BuildingOfficeIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Industry</dt>
                    <dd className="text-text-primary">{account.industry}</dd>
                  </div>
                </div>
              )}
              {account.employeeCount && (
                <div className="flex items-start gap-3">
                  <UserGroupIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Employees</dt>
                    <dd className="text-text-primary">{account.employeeCount.toLocaleString()}</dd>
                  </div>
                </div>
              )}
              {(account.city || account.country) && (
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Location</dt>
                    <dd className="text-text-primary">
                      {[account.city, account.state, account.country].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card padding="lg">
          <CardHeader
            action={
              <Link href={`/contacts?accountId=${id}`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            }
          >
            Contacts
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No contacts yet</p>
            ) : (
              <ul className="space-y-3">
                {contacts.slice(0, 5).map((contact) => (
                  <li key={contact.id}>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-300"
                    >
                      <div className="h-8 w-8 rounded-full bg-secondary-500/20 flex items-center justify-center text-sm font-medium text-secondary-700 dark:text-secondary-500">
                        {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {contact.firstName && contact.lastName
                            ? `${contact.firstName} ${contact.lastName}`
                            : contact.email}
                        </p>
                        {contact.title && (
                          <p className="text-xs text-text-muted truncate">{contact.title}</p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card padding="lg">
          <CardHeader>Recent Activity</CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No activities yet</p>
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
  );
}

