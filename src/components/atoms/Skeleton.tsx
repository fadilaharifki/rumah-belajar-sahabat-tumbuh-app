'use client';

import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return (
    <div className={`bg-slate-200/80 animate-pulse rounded-xl ${className}`} />
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-2xl" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-44" />
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="p-4 bg-white rounded-3xl border border-slate-200 space-y-4">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; text?: string }> = ({
  size = 'md',
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-3',
    lg: 'w-10 h-10 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-3 text-slate-500">
      <div
        className={`${sizeClasses[size]} rounded-full border-emerald-600 border-t-transparent animate-spin`}
      />
      {text && <p className="text-xs font-semibold text-slate-600">{text}</p>}
    </div>
  );
};
