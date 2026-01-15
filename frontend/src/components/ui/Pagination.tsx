'use client';

import clsx from 'clsx';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  className,
}: PaginationProps) {
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div
      className={clsx(
        'flex items-center justify-between px-4 py-3',
        'border-t border-border',
        className
      )}
    >
      <div className="text-sm text-text-muted">
        Showing <span className="font-medium text-text-primary">{startItem}</span> to{' '}
        <span className="font-medium text-text-primary">{endItem}</span> of{' '}
        <span className="font-medium text-text-primary">{total}</span> results
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={clsx(
            'h-8 w-8 flex items-center justify-center rounded-md',
            'border border-border',
            'transition-colors duration-120',
            page <= 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-text-primary hover:bg-gray-100 dark:hover:bg-gray-300'
          )}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span className="text-sm text-text-muted px-2">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={clsx(
            'h-8 w-8 flex items-center justify-center rounded-md',
            'border border-border',
            'transition-colors duration-120',
            page >= totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-text-primary hover:bg-gray-100 dark:hover:bg-gray-300'
          )}
          aria-label="Next page"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default Pagination;

