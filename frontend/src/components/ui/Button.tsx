import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-primary-700 text-white',
    'hover:bg-primary-900 hover:shadow-card',
    'active:bg-primary-900',
    'disabled:bg-gray-400 disabled:cursor-not-allowed'
  ),
  secondary: clsx(
    'bg-transparent border border-border text-primary-700',
    'hover:bg-surface-primary-a06',
    'active:bg-surface-primary-a06',
    'disabled:text-gray-400 disabled:cursor-not-allowed'
  ),
  ghost: clsx(
    'bg-transparent text-text-muted',
    'hover:text-text-primary hover:bg-surface-primary-a06',
    'active:bg-surface-primary-a06',
    'disabled:text-gray-400 disabled:cursor-not-allowed'
  ),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  leftIcon,
  rightIcon,
  isLoading,
  disabled,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium',
        'rounded-md',
        'transition-all duration-120',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export function IconButton({
  variant = 'ghost',
  size = 'md',
  children,
  className,
  'aria-label': ariaLabel,
  ...props
}: Omit<ButtonProps, 'leftIcon' | 'rightIcon'> & { 'aria-label': string }) {
  const iconSizeClasses: Record<ButtonSize, string> = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
  };

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center',
        'rounded-md',
        'transition-all duration-120',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
        variantClasses[variant],
        iconSizeClasses[size],
        className
      )}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
