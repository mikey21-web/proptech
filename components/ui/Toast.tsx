'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils/cn';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; bg: string }> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200',
  },
};

function ToastItem({ toast: t, onClose }: { toast: ToastData; onClose: (id: string) => void }) {
  const config = variantConfig[t.variant];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => onClose(t.id), t.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onClose]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in slide-in-from-right-full',
        config.bg,
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{t.message}</p>
      <button
        onClick={() => onClose(t.id)}
        className="flex-shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
