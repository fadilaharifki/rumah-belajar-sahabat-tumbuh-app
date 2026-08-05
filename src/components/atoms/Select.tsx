'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

export interface SelectProps {
  options?: SelectOption[];
  value?: string | string[];
  onChange?: (value: any) => void;
  placeholder?: string;
  isSearchable?: boolean;
  isMulti?: boolean;
  isClearable?: boolean;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  name?: string;
}

export const Select: React.FC<SelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder = '-- Pilih Pilihan --',
  isSearchable = true,
  isMulti = false,
  isClearable = true,
  disabled = false,
  className,
  error = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize selected values as an array for unified handling
  const selectedValues = useMemo<string[]>(() => {
    if (Array.isArray(value)) return value;
    if (value !== undefined && value !== null && value !== '') return [String(value)];
    return [];
  }, [value]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle single selection
  const handleSelect = (optionValue: string) => {
    if (disabled) return;

    if (isMulti) {
      if (selectedValues.includes(optionValue)) {
        onChange?.(selectedValues.filter((v) => v !== optionValue));
      } else {
        onChange?.([...selectedValues, optionValue]);
      }
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle clear selection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.(isMulti ? [] : '');
  };

  // Remove single pill in multi mode
  const handleRemovePill = (valToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.(selectedValues.filter((v) => v !== valToRemove));
  };

  // Find label for single selection
  const singleSelectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === selectedValues[0]);
  }, [options, selectedValues]);

  return (
    <div ref={containerRef} className={twMerge('relative w-full text-xs font-semibold', className)}>
      {/* Trigger Input / Pill Box */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={clsx(
          'min-h-[36px] h-9 w-full flex items-center justify-between gap-2 px-3 py-1 bg-white border rounded-xl shadow-2xs transition cursor-pointer select-none text-xs font-semibold',
          error ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20' : 'border-slate-200 hover:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20',
          disabled && 'opacity-60 bg-slate-100 cursor-not-allowed',
          isOpen && 'ring-2 ring-emerald-500/20 border-emerald-500'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {isMulti ? (
            selectedValues.length > 0 ? (
              selectedValues.map((val) => {
                const opt = options.find((o) => String(o.value) === val);
                return (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 text-[11px] animate-in fade-in"
                  >
                    <span>{opt?.label || val}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemovePill(val, e)}
                      className="hover:text-rose-600 rounded-md p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-slate-400 font-medium">{placeholder}</span>
            )
          ) : singleSelectedOption ? (
            <span className="text-slate-900 font-bold truncate">
              {singleSelectedOption.label}
              {singleSelectedOption.subLabel && (
                <span className="text-slate-400 font-normal ml-1.5">({singleSelectedOption.subLabel})</span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </div>

        {/* Clear & Arrow Icons */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {isClearable && selectedValues.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
              title="Bersihkan pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={clsx('w-4 h-4 transition transform', isOpen && 'rotate-180 text-emerald-600')} />
        </div>
      </div>

      {/* Popover Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl p-2 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-1.5 max-h-56 flex flex-col">
          {/* Search Bar inside Popover */}
          {isSearchable && (
            <div className="relative shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Options List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const optValStr = String(opt.value);
                const isSelected = selectedValues.includes(optValStr);

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(optValStr)}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition text-xs font-semibold',
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                        : 'hover:bg-slate-100 text-slate-700'
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[10px] text-slate-400 font-normal truncate">{opt.subLabel}</span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-slate-400 font-medium text-xs">
                Tidak ada pilihan yang cocok.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
