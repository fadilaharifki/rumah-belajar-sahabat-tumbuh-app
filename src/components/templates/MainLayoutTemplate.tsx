'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '../organisms/Navbar';
import { Sidebar } from '../organisms/Sidebar';
import { MobileBottomNav } from '../organisms/MobileBottomNav';
import { AuthGuard } from '../organisms/AuthGuard';
import { ToastContainer } from '../atoms/ToastContainer';
import { useUIStore } from '@/stores/useUIStore';

export interface MainLayoutTemplateProps {
  children?: React.ReactNode;
}

export const MainLayoutTemplate: React.FC<MainLayoutTemplateProps> = ({ children }) => {
  const pathname = usePathname();
  const { isSidebarOpen, isSidebarCollapsed } = useUIStore();

  if (pathname === '/login') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
        <ToastContainer />
        {children}
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900 print:bg-white">
        {/* Floating Toast Alerts Container */}
        <ToastContainer />

        <div className="print:hidden">
          <Sidebar />
        </div>

        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            isSidebarOpen
              ? isSidebarCollapsed
                ? 'lg:pl-20'
                : 'lg:pl-64'
              : 'pl-0'
          } print:pl-0`}
        >
          <div className="print:hidden">
            <Navbar />
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto space-y-6 print:p-0 print:max-w-none">
            {children}
          </main>
        </div>

        {/* Mobile Fixed Bottom Navigation Bar */}
        <MobileBottomNav />
      </div>
    </AuthGuard>
  );
};
