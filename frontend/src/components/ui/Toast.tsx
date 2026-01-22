'use client';

import { useEffect, useState, createContext, useContext, useCallback, type ReactNode } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ─────────────────────────────────────────────────────────────
// Toast Types
// ─────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
  };
}

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ─────────────────────────────────────────────────────────────
// Toast Provider
// ─────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: useCallback((title: string, message?: string) => {
      addToast({ type: 'success', title, message });
    }, [addToast]),
    error: useCallback((title: string, message?: string) => {
      addToast({ type: 'error', title, message });
    }, [addToast]),
    warning: useCallback((title: string, message?: string) => {
      addToast({ type: 'warning', title, message });
    }, [addToast]),
    info: useCallback((title: string, message?: string) => {
      addToast({ type: 'info', title, message });
    }, [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Toast Container
// ─────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toast Item
// ─────────────────────────────────────────────────────────────

const iconMap = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

const styleMap = {
  success: {
    container: 'bg-surface border-success/30',
    icon: 'text-success',
    title: 'text-text-primary',
    message: 'text-text-muted',
  },
  error: {
    container: 'bg-surface border-danger/30',
    icon: 'text-danger',
    title: 'text-text-primary',
    message: 'text-text-muted',
  },
  warning: {
    container: 'bg-surface border-warning/30',
    icon: 'text-warning',
    title: 'text-text-primary',
    message: 'text-text-muted',
  },
  info: {
    container: 'bg-surface border-info/30',
    icon: 'text-info',
    title: 'text-text-primary',
    message: 'text-text-muted',
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const duration = toast.duration ?? 5000;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = requestAnimationFrame(() => setIsVisible(true));

    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, duration);
      return () => {
        cancelAnimationFrame(showTimer);
        clearTimeout(timer);
      };
    }
    return () => cancelAnimationFrame(showTimer);
  }, [toast.id, duration, onRemove]);

  const Icon = iconMap[toast.type];
  const styles = styleMap[toast.type];

  return (
    <div
      role="alert"
      style={{
        transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      }}
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${styles.container}
      `}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${styles.icon}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${styles.title}`}>{toast.title}</p>
        {toast.message && (
          <p className={`text-sm mt-1 ${styles.message}`}>{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className={`flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${styles.icon}`}
        aria-label="Dismiss"
      >
        <XMarkIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
