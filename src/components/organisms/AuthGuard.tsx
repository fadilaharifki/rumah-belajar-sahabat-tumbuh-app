'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
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

  const reqPerm = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || (route !== '/' && pathname.startsWith(route))
  );

  const isAllowed = reqPerm ? can(ROUTE_PERMISSIONS[reqPerm].action, ROUTE_PERMISSIONS[reqPerm].resource) : true;
  const isUnauthenticated = user?.id === 'guest';

  useEffect(() => {
    if (pathname !== '/login' && isUnauthenticated) {
      router.push('/login');
    }
  }, [pathname, isUnauthenticated, router]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isUnauthenticated) {
    return null;
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
