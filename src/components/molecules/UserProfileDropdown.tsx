import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';

export const UserProfileDropdown: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, activeRole } = useAuthStore();
  const { signOut } = useAuth();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin / Pemilik';
      case 'teacher':
        return 'Pengajar / Guru';
      case 'parent':
        return 'Orang Tua / Wali';
      default:
        return role;
    }
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left z-30">
      {/* User Info Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-xs hover:bg-slate-50 hover:border-emerald-300/80 shadow-2xs transition-all duration-200 cursor-pointer group"
      >
        <div className="relative">
          <Avatar
            src={user?.avatar_url}
            name={user?.full_name || 'Pengguna'}
            size="sm"
            className="ring-2 ring-emerald-500/80 shadow-2xs group-hover:scale-105 transition-transform duration-200"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
        </div>

        <div className="hidden md:block text-left space-y-0.5 min-w-0 max-w-[130px]">
          <div className="text-xs font-bold text-slate-800 leading-tight truncate">
            {user?.full_name || 'Pengguna'}
          </div>
          <p className="text-[10px] font-semibold text-emerald-700 truncate">
            {getRoleLabel(activeRole)}
          </p>
        </div>

        <ChevronDown className={`w-4 h-4 text-slate-400 hidden md:block transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-72 sm:w-76 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl shadow-slate-300/50 border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150 space-y-3">
          {/* User Profile Header Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-amber-50/40 border border-emerald-200/70 space-y-2.5 relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Avatar
                  src={user?.avatar_url}
                  name={user?.full_name || 'Pengguna'}
                  size="md"
                  className="ring-2 ring-emerald-500 shadow-xs"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-sm text-slate-900 truncate leading-snug">
                  {user?.full_name}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-emerald-200/50">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Peran Aktif:</span>
              </div>
              <Badge variant={activeRole === 'admin' ? 'amber' : 'emerald'} size="sm" className="font-bold shadow-2xs">
                {getRoleLabel(activeRole)}
              </Badge>
            </div>
          </div>

          {/* Actions List */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <Link
              href="/pengaturan"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/80 transition-all duration-150 group"
            >
              <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-700 text-slate-500 transition-colors">
                <Settings className="w-4 h-4" />
              </div>
              <span>Pengaturan Profil Akun</span>
            </Link>

            {/* ELEGANT LOGOUT BUTTON */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/70 hover:bg-rose-600 hover:text-white border border-rose-100 hover:border-rose-600 transition-all duration-200 shadow-2xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-rose-100 group-hover:bg-rose-500 text-rose-600 group-hover:text-white transition-colors">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Keluar (Sign Out)</span>
              </div>
              <span className="text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
