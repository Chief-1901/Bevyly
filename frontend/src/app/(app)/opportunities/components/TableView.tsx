'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Menu, MenuItem } from '@/components/ui/Menu';
import { Pagination } from '@/components/ui/Pagination';
import { Card } from '@/components/ui/Card';
import {
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { Opportunity, Account } from '@/lib/api/server';

interface TableViewProps {
  opportunities: Opportunity[];
  accounts: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  onPageChange: (page: number) => void;
  onDelete: (id: string) => Promise<void>;
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

export function TableView({
  opportunities,
  accounts,
  pagination,
  onPageChange,
  onDelete,
}: TableViewProps) {
  const router = useRouter();
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  return (
    <Card padding="none">
      <Table>
        <TableCaption>List of opportunities</TableCaption>
        <TableHeader>
          <TableRow hover={false}>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Account</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="hidden md:table-cell">Amount</TableHead>
            <TableHead className="hidden lg:table-cell">Close Date</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opp) => {
            const account = accountMap.get(opp.accountId);
            return (
              <TableRow key={opp.id}>
                <TableCell>
                  <Link
                    href={`/opportunities/${opp.id}`}
                    className="font-medium hover:text-primary-700 dark:hover:text-primary-500"
                  >
                    {opp.name}
                  </Link>
                </TableCell>
                <TableCell className="hidden sm:table-cell" muted>
                  {account ? (
                    <Link
                      href={`/accounts/${account.id}`}
                      className="hover:text-primary-700 dark:hover:text-primary-500"
                    >
                      {account.name}
                    </Link>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={stageBadgeVariant(opp.stage)}>
                    {opp.stage.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {opp.amount ? formatCurrency(opp.amount) : '-'}
                </TableCell>
                <TableCell className="hidden lg:table-cell" muted>
                  {formatDate(opp.closeDate)}
                </TableCell>
                <TableCell>
                  <Menu align="right">
                    <MenuItem
                      icon={<EyeIcon className="h-4 w-4" />}
                      onClick={() => router.push(`/opportunities/${opp.id}`)}
                    >
                      View
                    </MenuItem>
                    <MenuItem
                      icon={<PencilIcon className="h-4 w-4" />}
                      onClick={() => router.push(`/opportunities/${opp.id}/edit`)}
                    >
                      Edit
                    </MenuItem>
                    <MenuItem
                      icon={<TrashIcon className="h-4 w-4" />}
                      danger
                      onClick={() => onDelete(opp.id)}
                    >
                      Delete
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={onPageChange}
        />
      )}
    </Card>
  );
}
