'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { MainLayoutTemplate } from '@/components/templates/MainLayoutTemplate';
import { PwaInstallPrompt } from '@/components/molecules/PwaInstallPrompt';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MainLayoutTemplate>
        {children}
        <PwaInstallPrompt />
      </MainLayoutTemplate>
    </QueryClientProvider>
  );
}
