'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, Info, ShieldAlert, X } from 'lucide-react';
import { useToastStore, ToastItem } from '@/stores/useToastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none print:hidden">
      {toasts.map((t) => (
        <ToastSingle key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
};

const ToastSingle: React.FC<{ toast: ToastItem; onClose: () => void }> = ({ toast, onClose }) => {
  const getStyle = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-900/95 text-white border-emerald-500/50 shadow-emerald-900/20',
          icon: <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
        };
      case 'error':
        return {
          bg: 'bg-rose-900/95 text-white border-rose-500/50 shadow-rose-900/20',
          icon: <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
        };
      case 'warning':
        return {
          bg: 'bg-amber-950/95 text-amber-100 border-amber-500/50 shadow-amber-900/20',
          icon: <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
        };
      case 'info':
      default:
        return {
          bg: 'bg-slate-900/95 text-white border-slate-700 shadow-slate-900/20',
          icon: <Info className="w-5 h-5 text-emerald-400 shrink-0" />
        };
    }
  };

  const style = getStyle(toast.type);

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${style.bg}`}
    >
      <div className="flex items-center gap-2.5">
        {style.icon}
        <span className="text-xs font-semibold leading-snug">{toast.message}</span>
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
