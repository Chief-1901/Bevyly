import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  contactsApi,
  accountsApi,
  opportunitiesApi,
  activitiesApi,
  type Contact,
  type Account,
  type Opportunity,
  type Activity,
} from '@/lib/api/server';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ContextualSidebar } from '@/components/intent';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CalendarIcon,
  PencilIcon,
  ArrowLeftIcon,
  MapPinIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export const dynamic = 'force-dynamic';

async function fetchContactDetails(id: string) {
  const contactResult = await contactsApi.get(id);

  if (!contactResult.success || !contactResult.data) {
    return null;
  }

  const contact = contactResult.data as Contact;

  // Fetch related data in parallel
  const [accountResult, opportunitiesResult, activitiesResult] = await Promise.all([
    contact.accountId ? accountsApi.get(contact.accountId) : Promise.resolve({ success: false, data: null }),
    opportunitiesApi.list({ contactId: id }),
    activitiesApi.getContactTimeline(id),
  ]);

  return {
    contact,
    account: (accountResult.success && accountResult.data ? accountResult.data : null) as Account | null,
    opportunities: (opportunitiesResult.success && opportunitiesResult.data ? opportunitiesResult.data : []) as Opportunity[],
    activities: (activitiesResult.success && activitiesResult.data?.data ? activitiesResult.data.data : []) as Activity[],
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function getStatusColor(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'prospect':
      return 'info';
    case 'inactive':
      return 'neutral';
    case 'disqualified':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getEngagementTierColor(tier?: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!tier) return 'neutral';
  if (tier >= 4) return 'success';
  if (tier >= 2) return 'warning';
  return 'danger';
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchContactDetails(id);

  if (!data) {
    notFound();
  }

  const { contact, account, opportunities, activities } = data;
  const totalPipeline = opportunities.reduce((sum, o) => sum + (o.amount || 0), 0);
  const fullName = contact.firstName && contact.lastName
    ? `${contact.firstName} ${contact.lastName}`
    : contact.email;

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              href="/contacts"
              className="mt-1 p-2 -ml-2 text-text-muted hover:text-text-primary rounded-md hover:bg-gray-100 dark:hover:bg-gray-300"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div className="h-12 w-12 rounded-full bg-secondary-500/20 flex items-center justify-center text-lg font-medium text-secondary-700 dark:text-secondary-500">
              {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-text-primary">
                  {fullName}
                </h1>
                <Badge variant={getStatusColor(contact.status)}>
                  {contact.status}
                </Badge>
                {contact.engagementTier && (
                  <Badge variant={getEngagementTierColor(contact.engagementTier)}>
                    Tier {contact.engagementTier}
                  </Badge>
                )}
              </div>
              {contact.title && (
                <p className="text-text-muted mt-1">{contact.title}</p>
              )}
              {account && (
                <Link
                  href={`/accounts/${account.id}`}
                  className="text-sm text-primary-700 hover:text-primary-800 mt-1 inline-block"
                >
                  {account.name}
                </Link>
              )}
            </div>
          </div>
          <Link href={`/contacts/${id}/edit`}>
            <Button variant="secondary" leftIcon={<PencilIcon className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-info/20 flex items-center justify-center">
                <BriefcaseIcon className="h-5 w-5 text-info" />
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
                <ChartBarIcon className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Pipeline Value</p>
                <p className="text-xl font-bold text-text-primary">{formatCurrency(totalPipeline)}</p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-warning/20 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Activities</p>
                <p className="text-xl font-bold text-text-primary">{activities.length}</p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-secondary-500/20 flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-secondary-700 dark:text-secondary-500" />
              </div>
              <div>
                <p className="text-sm text-text-muted">Engagement</p>
                <p className="text-xl font-bold text-text-primary">
                  {contact.engagementScore || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <Card padding="lg">
            <CardHeader>Contact Info</CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex items-start gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Email</dt>
                    <dd className="text-text-primary">
                      <a href={`mailto:${contact.email}`} className="hover:text-primary-700">
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                </div>
                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <PhoneIcon className="h-5 w-5 text-text-muted mt-0.5" />
                    <div>
                      <dt className="text-sm text-text-muted">Phone</dt>
                      <dd className="text-text-primary">
                        <a href={`tel:${contact.phone}`} className="hover:text-primary-700">
                          {contact.phone}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}
                {contact.department && (
                  <div className="flex items-start gap-3">
                    <BriefcaseIcon className="h-5 w-5 text-text-muted mt-0.5" />
                    <div>
                      <dt className="text-sm text-text-muted">Department</dt>
                      <dd className="text-text-primary">{contact.department}</dd>
                    </div>
                  </div>
                )}
                {account && (
                  <div className="flex items-start gap-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-text-muted mt-0.5" />
                    <div>
                      <dt className="text-sm text-text-muted">Company</dt>
                      <dd className="text-text-primary">
                        <Link href={`/accounts/${account.id}`} className="hover:text-primary-700">
                          {account.name}
                        </Link>
                      </dd>
                    </div>
                  </div>
                )}
                {contact.timezone && (
                  <div className="flex items-start gap-3">
                    <ClockIcon className="h-5 w-5 text-text-muted mt-0.5" />
                    <div>
                      <dt className="text-sm text-text-muted">Timezone</dt>
                      <dd className="text-text-primary">{contact.timezone}</dd>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <dt className="text-sm text-text-muted">Added</dt>
                    <dd className="text-text-primary">{formatDate(contact.createdAt)}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card padding="lg">
            <CardHeader
              action={
                <Link href={`/opportunities?contactId=${id}`}>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              }
            >
              Opportunities
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-4">No opportunities yet</p>
              ) : (
                <ul className="space-y-3">
                  {opportunities.slice(0, 5).map((opportunity) => (
                    <li key={opportunity.id}>
                      <Link
                        href={`/opportunities/${opportunity.id}`}
                        className="block p-2 -mx-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-300"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {opportunity.name}
                            </p>
                            <p className="text-xs text-text-muted">
                              {opportunity.stage}
                            </p>
                          </div>
                          {opportunity.amount && (
                            <p className="text-sm font-medium text-text-primary">
                              {formatCurrency(opportunity.amount)}
                            </p>
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

      {/* Contextual Sidebar - Desktop only */}
      <div className="hidden xl:block">
        <ContextualSidebar
          entityType="contact"
          entityId={id}
          entityName={fullName}
        />
      </div>
    </div>
  );
}
