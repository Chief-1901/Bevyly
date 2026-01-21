import { notFound } from 'next/navigation';
import Link from 'next/link';
import { leadsApi } from '@/lib/api/server';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  TagIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface LeadDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'converted':
      return 'success';
    case 'qualified':
      return 'info';
    case 'contacted':
      return 'warning';
    case 'rejected':
    case 'unqualified':
      return 'danger';
    default:
      return 'neutral';
  }
};

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function LeadDetailPage(props: LeadDetailPageProps) {
  const params = await props.params;
  const result = await leadsApi.get(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const lead = result.data;
  const contactName = [lead.contactFirstName, lead.contactLastName]
    .filter(Boolean)
    .join(' ') || 'No contact name';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/leads"
            className="p-2 rounded-md hover:bg-surface-primary-a06 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-text-muted" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{lead.companyName}</h1>
              <Badge variant={statusBadgeVariant(lead.status)}>{lead.status}</Badge>
            </div>
            {lead.domain && (
              <p className="text-sm text-text-muted mt-1">{lead.domain}</p>
            )}
          </div>
        </div>
        {lead.status !== 'converted' && lead.status !== 'rejected' && (
          <div className="flex gap-2">
            <Button variant="secondary">Reject</Button>
            <Button>Convert to Account</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info */}
          <Card>
            <CardHeader>Company Information</CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <BuildingOfficeIcon className="h-5 w-5 text-text-muted" />
                <div>
                  <p className="text-sm text-text-muted">Company Name</p>
                  <p className="font-medium text-text-primary">{lead.companyName}</p>
                </div>
              </div>
              {lead.industry && (
                <div className="flex items-center gap-3">
                  <TagIcon className="h-5 w-5 text-text-muted" />
                  <div>
                    <p className="text-sm text-text-muted">Industry</p>
                    <p className="font-medium text-text-primary">{lead.industry}</p>
                  </div>
                </div>
              )}
              {lead.employeeCount && (
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-text-muted" />
                  <div>
                    <p className="text-sm text-text-muted">Employee Count</p>
                    <p className="font-medium text-text-primary">{lead.employeeCount.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {(lead.city || lead.state || lead.country) && (
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-5 w-5 text-text-muted" />
                  <div>
                    <p className="text-sm text-text-muted">Location</p>
                    <p className="font-medium text-text-primary">
                      {[lead.city, lead.state, lead.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>Contact Information</CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-text-muted" />
                <div>
                  <p className="text-sm text-text-muted">Contact Name</p>
                  <p className="font-medium text-text-primary">{contactName}</p>
                </div>
              </div>
              {lead.contactTitle && (
                <div className="flex items-center gap-3">
                  <TagIcon className="h-5 w-5 text-text-muted" />
                  <div>
                    <p className="text-sm text-text-muted">Title</p>
                    <p className="font-medium text-text-primary">{lead.contactTitle}</p>
                  </div>
                </div>
              )}
              {lead.contactEmail && (
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-text-muted" />
                  <div>
                    <p className="text-sm text-text-muted">Email</p>
                    <a
                      href={`mailto:${lead.contactEmail}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {lead.contactEmail}
                    </a>
                  </div>
                </div>
              )}
              {lead.contactPhone && (
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-text-muted" />
                  <div>
                    <p className="text-sm text-text-muted">Phone</p>
                    <a
                      href={`tel:${lead.contactPhone}`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      {lead.contactPhone}
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Scores */}
          <Card>
            <CardHeader>Lead Scores</CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-text-muted" />
                  <span className="text-sm text-text-muted">Fit Score</span>
                </div>
                <span
                  className={`text-lg font-semibold ${
                    lead.fitScore !== null && lead.fitScore !== undefined
                      ? lead.fitScore >= 70
                        ? 'text-success'
                        : lead.fitScore >= 40
                        ? 'text-warning'
                        : 'text-text-muted'
                      : 'text-text-muted'
                  }`}
                >
                  {lead.fitScore !== null && lead.fitScore !== undefined ? `${lead.fitScore}%` : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="h-5 w-5 text-text-muted" />
                  <span className="text-sm text-text-muted">Intent Score</span>
                </div>
                <span
                  className={`text-lg font-semibold ${
                    lead.intentScore !== null && lead.intentScore !== undefined
                      ? lead.intentScore >= 70
                        ? 'text-success'
                        : lead.intentScore >= 40
                        ? 'text-warning'
                        : 'text-text-muted'
                      : 'text-text-muted'
                  }`}
                >
                  {lead.intentScore !== null && lead.intentScore !== undefined ? `${lead.intentScore}%` : '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Source & Meta */}
          <Card>
            <CardHeader>Source Information</CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-text-muted">Source</p>
                <p className="font-medium text-text-primary">{lead.source}</p>
              </div>
              {lead.campaignId && (
                <div>
                  <p className="text-sm text-text-muted">Campaign ID</p>
                  <p className="font-medium text-text-primary">{lead.campaignId}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-text-muted">Created</p>
                <p className="font-medium text-text-primary">{formatDate(lead.createdAt)}</p>
              </div>
              {lead.convertedAt && (
                <div>
                  <p className="text-sm text-text-muted">Converted</p>
                  <p className="font-medium text-text-primary">{formatDate(lead.convertedAt)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Converted Links */}
          {lead.status === 'converted' && (
            <Card>
              <CardHeader>Converted To</CardHeader>
              <CardContent className="space-y-2">
                {lead.convertedAccountId && (
                  <Link
                    href={`/accounts/${lead.convertedAccountId}`}
                    className="block p-3 rounded-md bg-surface-primary-a06 hover:bg-surface-primary-a10 transition-colors"
                  >
                    <p className="text-sm text-text-muted">Account</p>
                    <p className="font-medium text-primary-600">View Account →</p>
                  </Link>
                )}
                {lead.convertedContactId && (
                  <Link
                    href={`/contacts/${lead.convertedContactId}`}
                    className="block p-3 rounded-md bg-surface-primary-a06 hover:bg-surface-primary-a10 transition-colors"
                  >
                    <p className="text-sm text-text-muted">Contact</p>
                    <p className="font-medium text-primary-600">View Contact →</p>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
