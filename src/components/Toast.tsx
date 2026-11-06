'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id?: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onDismiss: () => void;
}

export function Toast({
  type,
  title,
  message,
  duration = 4000,
  onDismiss,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const typeConfig = {
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />,
      border: 'border-emerald-200 bg-white shadow-emerald-500/10',
      badge: 'bg-emerald-50 text-emerald-800',
    },
    error: {
      icon: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
      border: 'border-rose-200 bg-white shadow-rose-500/10',
      badge: 'bg-rose-50 text-rose-800',
    },
    info: {
      icon: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
      border: 'border-blue-200 bg-white shadow-blue-500/10',
      badge: 'bg-blue-50 text-blue-800',
    },
  }[type];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-xl border p-4 shadow-lg transition-all transform ease-out duration-200',
        typeConfig.border
      )}
    >
      <div className="mt-0.5">{typeConfig.icon}</div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="text-sm font-semibold text-slate-900 leading-tight">
            {title}
          </h4>
        )}
        <p className="text-sm text-slate-600 mt-0.5 leading-snug break-words">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors -mr-1 -mt-1"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
