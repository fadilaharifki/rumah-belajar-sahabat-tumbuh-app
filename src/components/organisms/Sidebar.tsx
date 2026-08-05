import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Calculator, 
  Users, 
  GraduationCap, 
  ShieldCheck,
  UserCheck,
  HeartHandshake,
  Settings,
  UserCog,
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  Sprout
} from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { useAbility } from '@/hooks/useAbility';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { isSidebarOpen, isSidebarCollapsed, toggleSidebar, toggleSidebarCollapse } = useUIStore();
  const { can } = useAbility();

  const isRouteActive = (currentPath: string, href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, isVisible: can('read', 'dashboard') },
    { name: 'Presensi Check-In', href: '/presensi', icon: Camera, isVisible: can('read', 'presensi') },
    { name: 'Jadwal Ngajar', href: '/jadwal', icon: CalendarDays, isVisible: can('read', 'jadwal') },
    { name: 'Data Guru / Pengajar', href: '/data-guru', icon: UserCheck, isVisible: can('read', 'guru') },
    { name: 'Data Siswa', href: '/data-siswa', icon: GraduationCap, isVisible: can('read', 'siswa') },
    { name: 'Data Wali Siswa', href: '/data-wali', icon: HeartHandshake, isVisible: can('read', 'wali') },
    { name: 'Data Staff Management', href: '/data-staff', icon: Users, isVisible: can('read', 'staff') },
    { name: 'Data Pengguna & Peran', href: '/data-pengguna', icon: UserCog, isVisible: can('manage', 'roles') },
    { name: 'Rekap Penggajian', href: '/penggajian', icon: Calculator, isVisible: can('read', 'penggajian') },
    { name: 'Manajemen Peran (RBAC)', href: '/manajemen-peran', icon: ShieldCheck, isVisible: can('manage', 'roles') },
    { name: 'Pengaturan Profil', href: '/pengaturan', icon: Settings, isVisible: true },
  ];

  const filteredNav = navigation.filter((item) => item.isVisible);

  return (
    <>
      {/* Backdrop overlay for mobile screen */}
      {isSidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-slate-200/80 p-3 transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col justify-between`}
      >
        <div>
          {/* Header Brand & Collapse Button */}
          <div className="flex items-center justify-between p-2 mb-4">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-600 text-amber-300">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="font-semibold text-slate-900 text-sm tracking-tight">Sahabat Tumbuh</span>
              </div>
            )}

            {/* Desktop Collapse Toggle Button */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition mx-auto cursor-pointer"
              title={isSidebarCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`flex items-center gap-3 p-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-amber-300 shadow-md shadow-emerald-200 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Info */}
        {!isSidebarCollapsed ? (
          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-center">
            <HeartHandshake className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xs font-semibold text-emerald-900">Sahabat Tumbuh</p>
            <p className="text-[10px] text-emerald-700 font-medium">Bulan Pendampingan / 2026</p>
          </div>
        ) : (
          <div className="p-2 bg-emerald-50 rounded-2xl text-center" title="Sahabat Tumbuh © 2026">
            <HeartHandshake className="w-5 h-5 text-emerald-600 mx-auto" />
          </div>
        )}
      </aside>
    </>
  );
};
