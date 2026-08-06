'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Sprout } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAbility, CRUDAction, Resource } from '@/hooks/useAbility';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';

export interface AuthGuardProps {
  children: React.ReactNode;
}

const ROUTE_PERMISSIONS: Record<string, { action: CRUDAction; resource: Resource }> = {
  '/': { action: 'read', resource: 'dashboard' },
  '/presensi': { action: 'read', resource: 'presensi' },
  '/jadwal': { action: 'read', resource: 'jadwal' },
  '/data-guru': { action: 'read', resource: 'guru' },
  '/data-siswa': { action: 'read', resource: 'siswa' },
  '/data-wali': { action: 'read', resource: 'wali' },
  '/data-staff': { action: 'read', resource: 'staff' },
  '/data-pengguna': { action: 'manage', resource: 'roles' },
  '/penggajian': { action: 'read', resource: 'penggajian' },
  '/manajemen-peran': { action: 'manage', resource: 'roles' }
};

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const { can } = useAbility();
  const [hasMounted, setHasMounted] = useState(false);

  // Wait for client hydration & localStorage restoration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isAuthenticated = Boolean(user && user.id && user.id !== 'guest');

  const reqPerm = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(route))
  );

  const isAllowed = isAuthenticated
    ? (reqPerm ? can(ROUTE_PERMISSIONS[reqPerm].action, ROUTE_PERMISSIONS[reqPerm].resource) : true)
    : false;

  useEffect(() => {
    if (hasMounted) {
      if (!isAuthenticated && pathname !== '/login') {
        router.replace('/login');
      } else if (isAuthenticated && pathname === '/login') {
        router.replace('/');
      }
    }
  }, [hasMounted, isAuthenticated, pathname, router]);

  // Loading Splash Screen during hydration check
  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-amber-300 flex items-center justify-center shadow-lg animate-pulse mb-3">
          <Sprout className="w-7 h-7" />
        </div>
        <p className="text-xs font-semibold text-slate-500 font-mono">Memeriksa Sesi Login...</p>
      </div>
    );
  }

  if (pathname === '/login') {
    if (isAuthenticated) {
      return null;
    }
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-amber-300 flex items-center justify-center shadow-lg animate-pulse mb-3">
          <Sprout className="w-7 h-7" />
        </div>
        <p className="text-xs font-semibold text-slate-500 font-mono">Mengarahkan ke Halaman Login...</p>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card variant="amber" className="max-w-md w-full text-center space-y-4 p-8 border-2 border-amber-300">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Akses Halaman Terbatas</h2>
            <p className="text-xs text-slate-600 font-medium mt-1">
              Halaman <strong className="text-slate-900">{pathname}</strong> membutuhkan izin (ability): {' '}
              <span className="font-semibold text-emerald-800">
                {reqPerm ? `${ROUTE_PERMISSIONS[reqPerm].resource}:${ROUTE_PERMISSIONS[reqPerm].action}` : 'Khusus Peran Tertentu'}
              </span>.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-1 text-amber-300" /> Kembali ke Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
