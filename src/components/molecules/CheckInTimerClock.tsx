import React from 'react';
import { Clock } from 'lucide-react';
import { useAttendanceStore } from '@/stores/useAttendanceStore';

export const CheckInTimerClock: React.FC = () => {
  const { elapsedSeconds, activeSession } = useAttendanceStore();

  if (!activeSession) return null;

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 bg-amber-400/90 text-slate-950 font-bold rounded-xl border border-amber-300 shadow-md animate-pulse">
      <Clock className="w-5 h-5 text-slate-900" />
      <div className="text-sm tracking-wider font-mono">
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </div>
      <span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans font-extrabold">
        Ongoing
      </span>
    </div>
  );
};
