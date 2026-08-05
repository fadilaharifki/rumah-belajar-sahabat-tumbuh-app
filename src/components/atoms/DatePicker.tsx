'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO
} from 'date-fns';
import { id as localeID } from 'date-fns/locale';

export interface DatePickerProps {
  value?: Date | string;
  onChange?: (date: Date) => void;
  mode?: 'date' | 'month';
  placeholder?: string;
  align?: 'left' | 'right' | 'auto';
  className?: string;
  iconOnly?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  mode = 'month',
  placeholder = 'Pilih Tanggal / Bulan',
  align = 'right',
  className = '',
  iconOnly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Current selected Date object
  const selectedDate = useMemoDate(value);
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

  function useMemoDate(val?: Date | string) {
    if (!val) return null;
    if (val instanceof Date) return val;
    try {
      if (val.length === 7) return parseISO(`${val}-01`); // e.g. "2026-08"
      return parseISO(val);
    } catch {
      return new Date();
    }
  }

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDateClick = (day: Date) => {
    if (onChange) onChange(day);
    setIsOpen(false);
  };

  const handleMonthClick = (monthOffset: number) => {
    const targetMonth = new Date(currentMonth.getFullYear(), monthOffset, 1);
    setCurrentMonth(targetMonth);
    if (mode === 'month' && onChange) {
      onChange(targetMonth);
      setIsOpen(false);
    }
  };

  const monthsList = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  // Calendar Grid Setup for Date mode
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const alignmentClass = align === 'left' ? 'left-0' : 'right-0';

  const formattedTitle = selectedDate
    ? mode === 'month'
      ? format(selectedDate, 'MMMM yyyy', { locale: localeID })
      : format(selectedDate, 'dd MMMM yyyy', { locale: localeID })
    : placeholder;

  return (
    <div ref={containerRef} className={`relative ${iconOnly ? 'inline-block' : 'w-full'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Filter Tanggal: ${formattedTitle}`}
        className={
          iconOnly
            ? "flex items-center justify-center w-8.5 h-8.5 sm:w-9 sm:h-9 bg-white border border-slate-200/90 rounded-xl text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs cursor-pointer shrink-0"
            : "w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition shadow-2xs cursor-pointer h-9"
        }
      >
        <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />

        {!iconOnly && (
          <>
            <span className="truncate text-xs font-semibold text-slate-800">
              {formattedTitle}
            </span>
            {value && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (onChange) onChange(new Date());
                }}
                className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0 ml-auto"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
          </>
        )}
      </button>

      {/* Popover Calendar Modal (Fully Responsive & Overflow-Safe) */}
      {isOpen && (
        <div className={`absolute ${alignmentClass} mt-2 z-50 w-72 max-w-[calc(100vw-1.5rem)] bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-3`}>
          {/* Calendar Header with Nav Controls */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-extrabold text-xs text-slate-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: localeID })}
            </span>

            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded-xl hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switch: Month Picker Grid */}
          {mode === 'month' ? (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {monthsList.map((m, idx) => {
                const isCurrent = currentMonth.getMonth() === idx;
                const isSelected = selectedDate && selectedDate.getMonth() === idx && selectedDate.getFullYear() === currentMonth.getFullYear();

                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthClick(idx)}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                        : isCurrent
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Mode Switch: Day Picker Grid */
            <div>
              <div className="grid grid-cols-7 text-center font-bold text-[10px] text-slate-400 pb-1">
                <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span>Min</span>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {days.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      className={`py-1.5 rounded-xl font-semibold text-center transition cursor-pointer ${
                        !isCurrentMonth
                          ? 'text-slate-300'
                          : isSelected
                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setCurrentMonth(today);
                if (onChange) onChange(today);
                setIsOpen(false);
              }}
              className="text-emerald-700 hover:underline cursor-pointer"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => {
                const lastMonth = subMonths(new Date(), 1);
                setCurrentMonth(lastMonth);
                if (onChange) onChange(lastMonth);
                setIsOpen(false);
              }}
              className="text-slate-500 hover:underline cursor-pointer"
            >
              Bulan Lalu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
