'use client';

import { Fragment, type ReactNode } from 'react';
import { Menu as HeadlessMenu, Transition, Portal } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import clsx from 'clsx';

interface MenuProps {
  children: ReactNode;
  trigger?: ReactNode;
  align?: 'left' | 'right';
}

export function Menu({ children, trigger, align = 'right' }: MenuProps) {
  const { refs, floatingStyles } = useFloating({
    placement: align === 'right' ? 'bottom-end' : 'bottom-start',
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  return (
    <HeadlessMenu as="div" className="relative inline-block text-left">
      <HeadlessMenu.Button
        ref={refs.setReference}
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

      <Portal>
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
            ref={refs.setFloating}
            style={floatingStyles}
            className={clsx(
              'z-[9999] w-48',
              'rounded-md',
              'bg-surface border border-border shadow-floating',
              'focus:outline-none'
            )}
          >
            <div className="py-1">{children}</div>
          </HeadlessMenu.Items>
        </Transition>
      </Portal>
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
