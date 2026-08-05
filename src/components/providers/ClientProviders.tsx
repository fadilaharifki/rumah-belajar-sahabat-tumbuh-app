'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { MainLayoutTemplate } from '@/components/templates/MainLayoutTemplate';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayoutTemplate>{children}</MainLayoutTemplate>
    </QueryClientProvider>
  );
}
