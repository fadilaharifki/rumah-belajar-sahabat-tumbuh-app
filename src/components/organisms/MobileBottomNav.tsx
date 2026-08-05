'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Camera, 
  GraduationCap, 
  Settings, 
  UserCheck, 
  HeartHandshake,
  Users,
  Calculator,
  ShieldCheck
} from 'lucide-react';
import { useAbility } from '@/hooks/useAbility';

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const { can } = useAbility();

  if (pathname === '/login') return null;

  const isRouteActive = (currentPath: string, href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  // Candidate items filtered strictly by user permissions
  const candidateItems = [
    { key: 'jadwal', label: 'Jadwal', href: '/jadwal', icon: CalendarDays, isAllowed: can('read', 'jadwal') },
    { key: 'guru', label: 'Guru', href: '/data-guru', icon: UserCheck, isAllowed: can('read', 'guru') },
    { key: 'siswa', label: 'Siswa', href: '/data-siswa', icon: GraduationCap, isAllowed: can('read', 'siswa') },
    { key: 'wali', label: 'Wali', href: '/data-wali', icon: HeartHandshake, isAllowed: can('read', 'wali') },
    { key: 'staff', label: 'Staff', href: '/data-staff', icon: Users, isAllowed: can('read', 'staff') },
    { key: 'penggajian', label: 'Payroll', href: '/penggajian', icon: Calculator, isAllowed: can('read', 'penggajian') },
    { key: 'roles', label: 'Peran', href: '/manajemen-peran', icon: ShieldCheck, isAllowed: can('manage', 'roles') },
  ].filter((item) => item.isAllowed);

  // Slot 1: Always Beranda (Dashboard)
  const slot1 = { label: 'Beranda', href: '/', icon: LayoutDashboard };

  // Slot 5: Always Akun (Pengaturan)
  const slot5 = { label: 'Akun', href: '/pengaturan', icon: Settings };

  // Slot 2: First allowed candidate item
  const slot2 = candidateItems[0] || { label: 'Jadwal', href: '/jadwal', icon: CalendarDays };

  // Slot 4: Second allowed candidate item (distinct from Slot 2 and Slot 5)
  const remainingCandidates = candidateItems.filter((item) => item.href !== slot2.href && item.href !== slot5.href);
  let slot4 = remainingCandidates[0];

  if (!slot4) {
    if (slot2.href !== '/data-siswa') {
      slot4 = { key: 'siswa', label: 'Siswa', href: '/data-siswa', icon: GraduationCap, isAllowed: true };
    } else {
      slot4 = { key: 'wali', label: 'Wali', href: '/data-wali', icon: HeartHandshake, isAllowed: true };
    }
  }

  const Slot1Icon = slot1.icon;
  const Slot2Icon = slot2.icon;
  const Slot4Icon = slot4.icon;
  const Slot5Icon = slot5.icon;

  const isSlot1Active = isRouteActive(pathname, slot1.href);
  const isSlot2Active = isRouteActive(pathname, slot2.href);
  const isSlot3Active = isRouteActive(pathname, '/presensi');
  const isSlot4Active = isRouteActive(pathname, slot4.href);
  const isSlot5Active = isRouteActive(pathname, slot5.href);

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 lg:hidden pointer-events-none px-4 print:hidden">
      {/* Precision 5-Column Equal Grid Container */}
      <div className="max-w-sm mx-auto bg-white/95 backdrop-blur-md rounded-full border border-slate-200/90 shadow-2xl px-2 py-2 pointer-events-auto relative">
        <div className="grid grid-cols-5 items-center justify-items-center text-center relative">
          
          {/* Item 1: Beranda */}
          <Link
            href={slot1.href}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl w-full transition duration-150 ${
              isSlot1Active ? 'text-emerald-700 font-semibold scale-105' : 'text-slate-500 hover:text-slate-700 font-medium'
            }`}
          >
            <Slot1Icon className="w-5 h-5 mx-auto" />
            <span className="text-[10px] tracking-tight mt-0.5 font-semibold block w-full text-center">{slot1.label}</span>
            {isSlot1Active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 mx-auto" />}
          </Link>

          {/* Item 2: Dynamic Primary Shortcut (e.g. Guru / Jadwal) */}
          <Link
            href={slot2.href}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl w-full transition duration-150 ${
              isSlot2Active ? 'text-emerald-700 font-semibold scale-105' : 'text-slate-500 hover:text-slate-700 font-medium'
            }`}
          >
            <Slot2Icon className="w-5 h-5 mx-auto" />
            <span className="text-[10px] tracking-tight mt-0.5 font-semibold block w-full text-center">{slot2.label}</span>
            {isSlot2Active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 mx-auto" />}
          </Link>

          {/* Item 3: Center Floating Camera Button (Presensi AI) */}
          <div className="flex flex-col items-center justify-center relative -top-6 w-full">
            <Link
              href="/presensi"
              className={`w-13 h-13 rounded-full bg-emerald-600 text-amber-300 flex items-center justify-center shadow-xl shadow-emerald-600/40 border-4 border-white ring-4 ring-slate-50 transition transform active:scale-95 hover:scale-110 mx-auto ${
                isSlot3Active ? 'bg-emerald-700 ring-emerald-300' : ''
              }`}
              title="Presensi Check-In AI"
            >
              <Camera className="w-6 h-6 animate-pulse" />
            </Link>
          </div>

          {/* Item 4: Dynamic Secondary Shortcut (e.g. Siswa / Wali / Staff) */}
          <Link
            href={slot4.href}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl w-full transition duration-150 ${
              isSlot4Active ? 'text-emerald-700 font-semibold scale-105' : 'text-slate-500 hover:text-slate-700 font-medium'
            }`}
          >
            <Slot4Icon className="w-5 h-5 mx-auto" />
            <span className="text-[10px] tracking-tight mt-0.5 font-semibold block w-full text-center">{slot4.label}</span>
            {isSlot4Active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 mx-auto" />}
          </Link>

          {/* Item 5: Akun */}
          <Link
            href={slot5.href}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-2xl w-full transition duration-150 ${
              isSlot5Active ? 'text-emerald-700 font-semibold scale-105' : 'text-slate-500 hover:text-slate-700 font-medium'
            }`}
          >
            <Slot5Icon className="w-5 h-5 mx-auto" />
            <span className="text-[10px] tracking-tight mt-0.5 font-semibold block w-full text-center">{slot5.label}</span>
            {isSlot5Active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5 mx-auto" />}
          </Link>

        </div>
      </div>
    </div>
  );
};
