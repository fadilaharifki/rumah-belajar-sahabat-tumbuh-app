'use client';

import React from 'react';
import { SkeletonCard, SkeletonTable } from '@/components/atoms/Skeleton';

export default function GlobalLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in">
      {/* Banner Skeleton */}
      <div className="p-6 rounded-3xl bg-slate-200/60 animate-pulse h-36 w-full" />

      {/* Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Table Skeleton */}
      <SkeletonTable rows={5} />
    </div>
  );
}
