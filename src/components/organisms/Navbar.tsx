import React from 'react';
import Link from 'next/link';
import { Menu, Sprout, Sparkles } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { CheckInTimerClock } from '../molecules/CheckInTimerClock';
import { UserProfileDropdown } from '../molecules/UserProfileDropdown';

export const Navbar: React.FC = () => {
  const { toggleSidebar } = useUIStore();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 sm:py-4 transition-all shadow-2xs">
      <div className="flex items-center justify-between gap-3 sm:gap-6">
        {/* Brand & Sidebar Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2.5 rounded-2xl text-slate-700 hover:bg-slate-100 transition lg:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-600 text-amber-300 shadow-md shadow-emerald-200 group-hover:scale-105 transition transform shrink-0">
              <Sprout className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div className="hidden min-[380px]:block">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 flex items-center gap-1.5 leading-tight">
                <span>Sahabat Tumbuh</span>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              </h1>
              <p className="text-xs font-semibold text-emerald-700 tracking-wide mt-0.5">Rumah Belajar</p>
            </div>
          </Link>
        </div>

        {/* Center: Real-time Active Timer (Desktop & Tablet) */}
        <div className="hidden lg:block">
          <CheckInTimerClock />
        </div>

        {/* Right: User Profile Dropdown (Clean, no extra login button) */}
        <div className="flex items-center gap-3 sm:gap-4">
          <UserProfileDropdown />
        </div>
      </div>
    </header>
  );
};
