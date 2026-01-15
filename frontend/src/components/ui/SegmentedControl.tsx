'use client';

import clsx from 'clsx';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'sm',
}: SegmentedControlProps<T>) {
  const sizeClasses = {
    sm: 'h-8 text-xs px-3',
    md: 'h-9 text-sm px-4',
  };

  return (
    <div
      className={clsx(
        'inline-flex rounded-full bg-surface-primary-a06 p-0.5',
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={clsx(
              'inline-flex items-center justify-center font-medium',
              'rounded-full transition-all duration-120',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:z-10',
              sizeClasses[size],
              isActive
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
