'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Sparkles, Check, ChevronDown, X } from 'lucide-react';

export interface TimePickerProps {
  value: string; // "HH:mm" e.g. "11:20"
  onChange: (time: string) => void;
  className?: string;
  align?: 'left' | 'right';
  position?: 'top' | 'bottom' | 'auto';
  isClearable?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  className = '',
  align = 'left',
  position = 'top',
  isClearable = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse hour and minute from value (defaulting to current time if empty)
  const parts = (value || '12:00').split(':');
  const currentHour = parts[0] || '12';
  const currentMinute = parts[1] || '00';

  // Hours array 00..23
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  
  // Minutes array 00..59
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  // Common quick time presets
  const quickPresets = [
    { label: '08:00 Pagi', value: '08:00' },
    { label: '10:00 Siang', value: '10:00' },
    { label: '13:00 Siang', value: '13:00' },
    { label: '15:00 Sore', value: '15:00' },
    { label: '17:00 Sore', value: '17:00' },
    { label: '19:00 Malam', value: '19:00' },
  ];

  // Calculate coordinates for portal positioning
  const updatePopoverCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isTop = position === 'top' || (position === 'auto' && spaceBelow < 320);

    const style: React.CSSProperties = {
      position: 'fixed',
      left: `${Math.max(12, Math.min(rect.left, window.innerWidth - 300))}px`,
      zIndex: 999999,
    };

    if (isTop) {
      style.bottom = `${window.innerHeight - rect.top + 8}px`;
    } else {
      style.top = `${rect.bottom + 8}px`;
    }

    setPopoverStyle(style);
  };

  useEffect(() => {
    if (isOpen) {
      updatePopoverCoords();
      const handleResizeOrScroll = () => updatePopoverCoords();
      window.addEventListener('resize', handleResizeOrScroll);
      window.addEventListener('scroll', handleResizeOrScroll, true);
      return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll, true);
      };
    }
  }, [isOpen, position]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${currentMinute}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${currentHour}:${m}`);
  };

  const handleSetNow = () => {
    const nowTime = new Date().toTimeString().slice(0, 5);
    onChange(nowTime);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Clickable Full Container Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2 bg-white border border-slate-200/90 hover:border-emerald-500 rounded-xl shadow-2xs transition cursor-pointer group select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Clock className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700 shrink-0 transition" />
          <span className="font-mono text-sm font-extrabold text-slate-900 tracking-tight">
            {value || '--:--'}
          </span>
          <span className="text-[10px] font-bold text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded">
            WIB
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isClearable && Boolean(value) && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition"
              title="Bersihkan jam"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[11px] font-semibold text-slate-400 group-hover:text-emerald-600 transition">
            Pilih Jam
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Hidden Native Time Input to support standard HTML form validation if needed */}
      <input type="hidden" value={value} readOnly />

      {/* Portal Popover Floating directly on document.body above all Modals & BottomSheets */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header with Quick Now Button */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">Pilih Jam Check-In</span>
            </div>
            <button
              type="button"
              onClick={handleSetNow}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[10px] shadow-2xs transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-300" /> Sekarang
            </button>
          </div>

          {/* Time Picker Columns (Jam & Menit Wheel) */}
          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
            {/* Hour Column */}
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase text-center tracking-wider pb-1">
                Jam
              </div>
              <div className="h-44 overflow-y-auto scrollbar-thin pr-1 space-y-1">
                {hours.map((h) => {
                  const isSelected = h === currentHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      className={`w-full py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-amber-300 shadow-2xs font-extrabold scale-[1.02]'
                          : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200/60'
                      }`}
                    >
                      <span>{h}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-300" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute Column */}
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase text-center tracking-wider pb-1">
                Menit
              </div>
              <div className="h-44 overflow-y-auto scrollbar-thin pr-1 space-y-1">
                {minutes.map((m) => {
                  const isSelected = m === currentMinute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      className={`w-full py-1.5 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-amber-300 shadow-2xs font-extrabold scale-[1.02]'
                          : 'bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200/60'
                      }`}
                    >
                      <span>{m}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-300" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Pintasan Sesi Jam:
            </div>
            <div className="grid grid-cols-3 gap-1">
              {quickPresets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    onChange(p.value);
                    setIsOpen(false);
                  }}
                  className={`px-2 py-1.5 rounded-xl font-mono text-[10px] font-bold text-center transition border cursor-pointer ${
                    value === p.value
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  {p.value}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
