'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  className?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  maxWidth = 'xl',
  className = '',
  showCloseButton = true,
}) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full sm:max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-backdrop">
      {/* Backdrop Overlay Click to Close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal (Desktop) / Bottom Sheet (Mobile) Container */}
      <div
        className={twMerge(
          clsx(
            'absolute sm:relative bottom-0 inset-x-0 sm:inset-auto w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col bg-white rounded-t-3xl rounded-b-none sm:rounded-2xl shadow-2xl border-t border-x border-b-0 sm:border border-slate-200 p-5 sm:p-6 pb-8 sm:pb-6 space-y-4 animate-bottom-sheet sm:animate-modal-desktop overflow-visible -mb-5 sm:mb-0 shrink-0 transform-gpu mx-auto',
            maxWidthClasses[maxWidth],
            className
          )
        )}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto sm:hidden mb-1 shrink-0" />

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {Icon && (
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer shrink-0 ml-2"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body / Children */}
        <div className="flex-1 overflow-y-auto overflow-x-visible pr-0.5 space-y-4">{children}</div>
      </div>
    </div>
  );
};
