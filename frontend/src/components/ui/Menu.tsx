'use client';

import { Fragment, type ReactNode } from 'react';
import { Menu as HeadlessMenu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface MenuProps {
  children: ReactNode;
  trigger?: ReactNode;
  align?: 'left' | 'right';
}

export function Menu({ children, trigger, align = 'right' }: MenuProps) {
  return (
    <HeadlessMenu as="div" className="relative inline-block text-left">
      <HeadlessMenu.Button
        className={clsx(
          'inline-flex items-center justify-center',
          'h-8 w-8 rounded-md',
          'text-text-muted hover:text-text-primary hover:bg-surface-primary-a06',
          'transition-colors duration-120',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
        )}
      >
        {trigger || <EllipsisVerticalIcon className="h-5 w-5" />}
        <span className="sr-only">Open menu</span>
      </HeadlessMenu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-120"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-120"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <HeadlessMenu.Items
          className={clsx(
            'absolute z-50 mt-2 w-48',
            'origin-top-right rounded-md',
            'bg-surface border border-border shadow-floating',
            'divide-y divide-gridline',
            'focus:outline-none',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div className="py-1">{children}</div>
        </HeadlessMenu.Items>
      </Transition>
    </HeadlessMenu>
  );
}

interface MenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: ReactNode;
}

export function MenuItem({
  children,
  onClick,
  disabled,
  danger,
  icon,
}: MenuItemProps) {
  return (
    <HeadlessMenu.Item disabled={disabled}>
      {({ active, disabled: isDisabled }) => (
        <button
          onClick={onClick}
          disabled={isDisabled}
          className={clsx(
            'flex w-full items-center gap-2 px-4 py-2 text-sm',
            'transition-colors duration-120',
            isDisabled && 'cursor-not-allowed opacity-50',
            danger
              ? active
                ? 'bg-danger-a10 text-danger'
                : 'text-danger'
              : active
              ? 'bg-surface-primary-a06 text-text-primary'
              : 'text-text-primary'
          )}
        >
          {icon && <span className="h-4 w-4">{icon}</span>}
          {children}
        </button>
      )}
    </HeadlessMenu.Item>
  );
}

export default Menu;
