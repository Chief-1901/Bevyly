import clsx from 'clsx';
import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react';

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode;
  className?: string;
  maxHeight?: string;
}

export function Table({ children, className, maxHeight = '400px', ...props }: TableProps) {
  return (
    <div
      className="overflow-x-auto overflow-y-auto scrollbar-thin"
      style={{ maxHeight }}
    >
      <table
        className={clsx('w-full text-sm text-left', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    <thead
      className={clsx(
        'bg-table-header-bg sticky top-0 z-10',
        'border-b border-gridline',
        className
      )}
    >
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    <tbody
      className={clsx(
        'divide-y divide-gridline bg-surface',
        className
      )}
    >
      {children}
    </tbody>
  );
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function TableRow({ children, className, hover = true, ...props }: TableRowProps) {
  return (
    <tr
      className={clsx(
        'h-14',
        hover && 'hover:bg-surface-primary-a06 transition-colors duration-120',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
  sortable?: boolean;
  sorted?: 'asc' | 'desc' | false;
  onSort?: () => void;
  align?: 'left' | 'right' | 'center';
}

export function TableHead({
  children,
  className,
  sortable,
  sorted,
  onSort,
  align = 'left',
  ...props
}: TableHeadProps) {
  const alignClasses = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
  };

  return (
    <th
      scope="col"
      className={clsx(
        'px-4 py-4 font-medium text-text-muted whitespace-nowrap h-14',
        alignClasses[align],
        sortable && 'cursor-pointer select-none hover:text-text-primary',
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className={clsx('flex items-center gap-1', align === 'right' && 'justify-end')}>
        {children}
        {sortable && (
          <span className="ml-1">
            {sorted === 'asc' ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : sorted === 'desc' ? (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="h-4 w-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            )}
          </span>
        )}
      </div>
    </th>
  );
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  align?: 'left' | 'right' | 'center';
}

export function TableCell({ children, className, muted, align = 'left', ...props }: TableCellProps) {
  const alignClasses = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
  };

  return (
    <td
      className={clsx(
        'px-4 py-4 whitespace-nowrap text-sm',
        alignClasses[align],
        muted ? 'text-text-muted' : 'text-text-primary',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

interface TableCaptionProps {
  children: ReactNode;
  className?: string;
}

export function TableCaption({ children, className }: TableCaptionProps) {
  return (
    <caption className={clsx('sr-only', className)}>
      {children}
    </caption>
  );
}

export default Table;
