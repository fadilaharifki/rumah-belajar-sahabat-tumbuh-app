'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Clock, ChevronDown, Check, Sparkles, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TimePickerProps {
  value?: string; // "HH:mm" e.g. "14:00"
  onChange: (time: string) => void;
  minTime?: string; // "HH:mm" - any time earlier than minTime is disabled
  maxTime?: string; // "HH:mm" - any time later than maxTime is disabled
  placeholder?: string;
  className?: string;
  position?: 'top' | 'bottom' | 'auto';
  align?: 'left' | 'right';
  disabled?: boolean;
  isClearable?: boolean;
  title?: string;
}

const ITEM_HEIGHT = 34; // px (compact iOS wheel item)
const VISIBLE_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT; // 170px
const PADDING_SPACER = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2); // 68px (2 items on top & bottom)

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

interface WheelColumnProps {
  label: string;
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isItemDisabled?: (index: number) => boolean;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  label,
  items,
  selectedIndex,
  onSelect,
  isItemDisabled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to selectedIndex smoothly or instantaneously
  const scrollToItem = useCallback((index: number, smooth = true) => {
    if (!containerRef.current) return;
    const targetTop = index * ITEM_HEIGHT;
    if (Math.abs(containerRef.current.scrollTop - targetTop) > 1) {
      containerRef.current.scrollTo({
        top: targetTop,
        behavior: smooth ? 'smooth' : 'instant',
      });
    }
  }, []);

  // Sync scroll position whenever selectedIndex changes externally
  useEffect(() => {
    if (!isScrollingRef.current) {
      scrollToItem(selectedIndex, false);
    }
  }, [selectedIndex, scrollToItem]);

  // Handle user manual scroll with snap detection & disabled boundaries clamping
  const handleScroll = () => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return;
      const currentScroll = containerRef.current.scrollTop;
      let newIndex = Math.max(0, Math.min(items.length - 1, Math.round(currentScroll / ITEM_HEIGHT)));

      // If user landed on a disabled item, clamp to nearest valid enabled item
      if (isItemDisabled?.(newIndex)) {
        let validIndex = -1;
        // Search forward first
        for (let i = newIndex; i < items.length; i++) {
          if (!isItemDisabled(i)) {
            validIndex = i;
            break;
          }
        }
        // If not found forward, search backward
        if (validIndex === -1) {
          for (let i = newIndex; i >= 0; i--) {
            if (!isItemDisabled(i)) {
              validIndex = i;
              break;
            }
          }
        }

        if (validIndex !== -1) {
          newIndex = validIndex;
          containerRef.current.scrollTo({
            top: newIndex * ITEM_HEIGHT,
            behavior: 'smooth',
          });
        }
      }

      onSelect(newIndex);
      isScrollingRef.current = false;
    }, 80);
  };

  return (
    <div className="flex-1 flex flex-col items-center select-none">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-50/70 border border-slate-100">
        {/* Top Fade Gradient Mask */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-slate-50 via-slate-50/80 to-transparent z-10" />

        {/* Center Target Highlight Capsule */}
        <div
          style={{ top: `${PADDING_SPACER}px`, height: `${ITEM_HEIGHT}px` }}
          className="pointer-events-none absolute inset-x-1 rounded-xl bg-emerald-500/10 border-y border-emerald-500/30 z-0 shadow-2xs"
        />

        {/* Bottom Fade Gradient Mask */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent z-10" />

        {/* Scrollable Items Container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          style={{ height: `${WHEEL_HEIGHT}px` }}
          className="w-full overflow-y-auto snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden relative z-5"
        >
          {/* Top Spacer */}
          <div style={{ height: `${PADDING_SPACER}px` }} />

          {/* Wheel Items */}
          {items.map((item, idx) => {
            const distance = Math.abs(idx - selectedIndex);
            const isCenter = distance === 0;
            const isNear = distance === 1;
            const isDisabled = isItemDisabled?.(idx);

            return (
              <div
                key={item}
                style={{ height: `${ITEM_HEIGHT}px` }}
                onClick={() => {
                  if (isDisabled) return;
                  onSelect(idx);
                  scrollToItem(idx, true);
                }}
                className={clsx(
                  'snap-center flex items-center justify-center font-mono transition-all duration-150 text-xs',
                  isDisabled
                    ? 'text-slate-300 opacity-20 cursor-not-allowed line-through select-none'
                    : [
                        'cursor-pointer',
                        isCenter && 'text-emerald-950 font-black text-sm scale-110 tracking-wide drop-shadow-xs',
                        isNear && 'text-slate-600 font-semibold text-xs scale-95 opacity-70 hover:opacity-100',
                        !isCenter && !isNear && 'text-slate-400 font-normal text-[10px] scale-85 opacity-35 hover:opacity-80'
                      ]
                )}
              >
                {item}
              </div>
            );
          })}

          {/* Bottom Spacer */}
          <div style={{ height: `${PADDING_SPACER}px` }} />
        </div>
      </div>
    </div>
  );
};

export const TimePicker: React.FC<TimePickerProps> = ({
  value = '',
  onChange,
  minTime,
  maxTime,
  placeholder = 'Pilih Jam',
  className = '',
  position = 'auto',
  align = 'left',
  disabled = false,
  isClearable = false,
  title = 'Pilih Jam Sesi',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState<{ top?: number; bottom?: number; left: number }>({ left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse minTime and maxTime
  const [minHour, minMinute] = useMemo(() => {
    if (!minTime) return [-1, -1];
    const parts = minTime.split(':');
    return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
  }, [minTime]);

  const [maxHour, maxMinute] = useMemo(() => {
    if (!maxTime) return [-1, -1];
    const parts = maxTime.split(':');
    return [parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0];
  }, [maxTime]);

  // Parse current value
  const [currentHour, currentMinute] = useMemo(() => {
    if (!value) return ['12', '00'];
    const parts = value.split(':');
    return [parts[0]?.padStart(2, '0') || '12', parts[1]?.padStart(2, '0') || '00'];
  }, [value]);

  // Auto-correct if current value is smaller than minTime or larger than maxTime
  useEffect(() => {
    if (minTime && value && value < minTime) {
      onChange(minTime);
    } else if (maxTime && value && value > maxTime) {
      onChange(maxTime);
    }
  }, [minTime, maxTime, value, onChange]);

  const curHourNum = useMemo(() => parseInt(currentHour, 10), [currentHour]);

  // Disable hours based on minHour / maxHour
  const isHourDisabled = useCallback(
    (hIdx: number) => {
      if (minHour !== -1 && hIdx < minHour) return true;
      if (maxHour !== -1 && hIdx > maxHour) return true;
      return false;
    },
    [minHour, maxHour]
  );

  // Disable minutes based on minMinute / maxMinute when at boundary hours
  const isMinuteDisabled = useCallback(
    (mIdx: number) => {
      if (minHour !== -1 && curHourNum === minHour && mIdx < minMinute) return true;
      if (maxHour !== -1 && curHourNum === maxHour && mIdx > maxMinute) return true;
      return false;
    },
    [minHour, minMinute, maxHour, maxMinute, curHourNum]
  );

  const hourIndex = useMemo(() => {
    const idx = HOURS.indexOf(currentHour);
    return idx >= 0 ? idx : 12;
  }, [currentHour]);

  const minuteIndex = useMemo(() => {
    const idx = MINUTES.indexOf(currentMinute);
    return idx >= 0 ? idx : 0;
  }, [currentMinute]);

  // Update popup positioning relative to trigger input with fail-safe bounds checking
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const POPOVER_HEIGHT = popoverRef.current?.offsetHeight || 300;
    const POPOVER_WIDTH = 270;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Prefer opening upward if space below is tight (less than 350px) and space above has more room,
    // or if position is explicitly 'top'
    const shouldShowAbove =
      position === 'top' ||
      (position === 'auto' && (spaceBelow < POPOVER_HEIGHT + 16 || (spaceBelow < 350 && spaceAbove > spaceBelow)));

    let left = align === 'right' ? rect.right - POPOVER_WIDTH : rect.left;
    left = Math.max(12, Math.min(left, window.innerWidth - POPOVER_WIDTH - 12));

    if (shouldShowAbove) {
      // Position above the trigger, bounded so it never goes above top of viewport
      const bottom = Math.min(window.innerHeight - 12, window.innerHeight - rect.top + 6);
      setPopoverCoords({
        bottom,
        left,
      });
    } else {
      // Position below the trigger, clamped so it never goes off the bottom of the viewport
      const maxTop = window.innerHeight - POPOVER_HEIGHT - 12;
      const top = Math.min(rect.bottom + 6, maxTop);
      setPopoverCoords({
        top: Math.max(12, top),
        left,
      });
    }
  }, [position, align]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Re-measure after initial paint to lock exact rendered height
      const animFrame = requestAnimationFrame(() => updatePosition());
      const onResizeScroll = () => updatePosition();
      window.addEventListener('resize', onResizeScroll);
      window.addEventListener('scroll', onResizeScroll, true);
      return () => {
        cancelAnimationFrame(animFrame);
        window.removeEventListener('resize', onResizeScroll);
        window.removeEventListener('scroll', onResizeScroll, true);
      };
    }
  }, [isOpen, updatePosition]);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
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

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleHourSelect = (newIdx: number) => {
    if (isHourDisabled(newIdx)) return;
    const newHour = HOURS[newIdx];
    const newHourNum = parseInt(newHour, 10);
    let newMinute = currentMinute;

    // If changing to minHour and current minute is smaller than minMinute, clamp to minMinute
    if (minHour !== -1 && newHourNum === minHour) {
      const curMinNum = parseInt(currentMinute, 10);
      if (curMinNum < minMinute) {
        newMinute = String(minMinute).padStart(2, '0');
      }
    }
    // If changing to maxHour and current minute is greater than maxMinute, clamp to maxMinute
    if (maxHour !== -1 && newHourNum === maxHour) {
      const curMinNum = parseInt(currentMinute, 10);
      if (curMinNum > maxMinute) {
        newMinute = String(maxMinute).padStart(2, '0');
      }
    }

    onChange(`${newHour}:${newMinute}`);
  };

  const handleMinuteSelect = (newIdx: number) => {
    if (isMinuteDisabled(newIdx)) return;
    const newMinute = MINUTES[newIdx];
    onChange(`${currentHour}:${newMinute}`);
  };

  const handleSetNow = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const nowTime = `${h}:${m}`;

    if (minTime && nowTime < minTime) {
      onChange(minTime);
    } else if (maxTime && nowTime > maxTime) {
      onChange(maxTime);
    } else {
      onChange(nowTime);
    }
  };

  const handleMinutePreset = (minStr: string) => {
    const minNum = parseInt(minStr, 10);
    if (isMinuteDisabled(minNum)) return;
    onChange(`${currentHour}:${minStr}`);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div ref={containerRef} className={twMerge('relative w-full', className)}>
      {/* Trigger Button Input */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={clsx(
          'h-9 w-full flex items-center justify-between gap-2 px-3 bg-white border rounded-xl text-xs font-semibold text-slate-800 shadow-2xs transition cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20',
          isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-400',
          disabled && 'opacity-60 bg-slate-100 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className={clsx('font-mono text-xs font-bold tracking-tight', value ? 'text-slate-900' : 'text-slate-400')}>
            {value || placeholder}
          </span>
          {value && (
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded leading-none">
              WIB
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isClearable && Boolean(value) && !disabled && (
            <span
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition"
              title="Reset jam"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={clsx(
              'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180 text-emerald-600'
            )}
          />
        </div>
      </div>

      {/* iOS Wheel Popover using React Portal */}
      {isOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: `${popoverCoords.left}px`,
              top: popoverCoords.top !== undefined ? `${popoverCoords.top}px` : undefined,
              bottom: popoverCoords.bottom !== undefined ? `${popoverCoords.bottom}px` : undefined,
              zIndex: 999999,
            }}
            className="w-[270px] bg-white rounded-3xl p-3 shadow-2xl border border-slate-200/90 animate-in fade-in zoom-in-95 space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">{title}</span>
              </div>
              <button
                type="button"
                onClick={handleSetNow}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-[10px] transition cursor-pointer active:scale-95"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" /> Sekarang
              </button>
            </div>

            {/* iOS Drum Wheel Pickers (Hours & Minutes) */}
            <div className="flex items-center gap-1">
              <WheelColumn
                label="Jam"
                items={HOURS}
                selectedIndex={hourIndex}
                onSelect={handleHourSelect}
                isItemDisabled={isHourDisabled}
              />

              <div className="flex flex-col items-center justify-center pt-3 font-mono font-black text-emerald-700 text-lg select-none">
                :
              </div>

              <WheelColumn
                label="Menit"
                items={MINUTES}
                selectedIndex={minuteIndex}
                onSelect={handleMinuteSelect}
                isItemDisabled={isMinuteDisabled}
              />
            </div>

            {/* Quick Minute Preset Buttons */}
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400">Pintasan:</span>
              <div className="flex gap-1">
                {['00', '15', '30', '45'].map((min) => {
                  const minNum = parseInt(min, 10);
                  const isPresetDisabled = isMinuteDisabled(minNum);
                  const isCurrent = currentMinute === min;

                  return (
                    <button
                      key={min}
                      type="button"
                      disabled={isPresetDisabled}
                      onClick={() => !isPresetDisabled && handleMinutePreset(min)}
                      className={clsx(
                        'px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold transition',
                        isPresetDisabled
                          ? 'bg-slate-50 text-slate-300 line-through cursor-not-allowed opacity-40'
                          : isCurrent
                          ? 'bg-emerald-600 text-white shadow-2xs cursor-pointer'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                      )}
                    >
                      :{min}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confirmation Action Button */}
            <div className="pt-0.5 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Selesai ({currentHour}:{currentMinute})
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
