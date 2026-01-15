'use client';

import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/Badge';
import { Menu, MenuItem } from '@/components/ui/Menu';
import { formatCurrency } from '@lib/api/dashboard';
import { EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface Transaction {
  id: string;
  customer: string;
  product: string;
  status: 'success' | 'pending' | 'refunded';
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  date: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
  className?: string;
}

type SortField = 'customer' | 'product' | 'date' | 'totalRevenue';
type SortOrder = 'asc' | 'desc';

export function TransactionsTable({
  transactions,
  className,
}: TransactionsTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'customer':
        comparison = a.customer.localeCompare(b.customer);
        break;
      case 'product':
        comparison = a.product.localeCompare(b.product);
        break;
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'totalRevenue':
        comparison = a.totalRevenue - b.totalRevenue;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={clsx('overflow-hidden rounded-md', className)}>
      <Table maxHeight="360px">
        <TableCaption>Recent transactions from opportunities</TableCaption>
        <TableHeader>
          <TableRow hover={false}>
            <TableHead
              sortable
              sorted={sortField === 'customer' ? sortOrder : false}
              onSort={() => handleSort('customer')}
            >
              Customer
            </TableHead>
            <TableHead
              sortable
              sorted={sortField === 'product' ? sortOrder : false}
              onSort={() => handleSort('product')}
              className="hidden sm:table-cell"
            >
              Product
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell" align="right">
              Qty
            </TableHead>
            <TableHead className="hidden lg:table-cell" align="right">
              Unit Price
            </TableHead>
            <TableHead
              sortable
              sorted={sortField === 'totalRevenue' ? sortOrder : false}
              onSort={() => handleSort('totalRevenue')}
              align="right"
            >
              Total
            </TableHead>
            <TableHead
              sortable
              sorted={sortField === 'date' ? sortOrder : false}
              onSort={() => handleSort('date')}
              className="hidden sm:table-cell"
            >
              Date
            </TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-secondary-500/20 flex items-center justify-center text-secondary-700 text-sm font-medium">
                    {transaction.customer.charAt(0)}
                  </div>
                  <span className="font-medium">{transaction.customer}</span>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell" muted>
                {transaction.product}
              </TableCell>
              <TableCell>
                <StatusBadge status={transaction.status} />
              </TableCell>
              <TableCell className="hidden md:table-cell" muted align="right">
                {transaction.quantity}
              </TableCell>
              <TableCell className="hidden lg:table-cell" muted align="right">
                {formatCurrency(transaction.unitPrice)}
              </TableCell>
              <TableCell align="right">
                <span className="font-medium">
                  {formatCurrency(transaction.totalRevenue)}
                </span>
              </TableCell>
              <TableCell className="hidden sm:table-cell" muted>
                {formatDate(transaction.date)}
              </TableCell>
              <TableCell>
                <Menu align="right">
                  <MenuItem
                    icon={<EyeIcon className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => console.log('View', transaction.id)}
                  >
                    View details
                  </MenuItem>
                  <MenuItem
                    icon={<PencilIcon className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => console.log('Edit', transaction.id)}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem
                    icon={<TrashIcon className="h-4 w-4" aria-hidden="true" />}
                    danger
                    onClick={() => console.log('Delete', transaction.id)}
                  >
                    Delete
                  </MenuItem>
                </Menu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default TransactionsTable;
