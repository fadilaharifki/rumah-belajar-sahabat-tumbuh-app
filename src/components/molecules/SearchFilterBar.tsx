import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import { Input } from '../atoms/Input';
import { Select, SelectOption } from '../atoms/Select';

export interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedTeacher: string;
  onTeacherChange: (value: string) => void;
  teacherOptions?: SelectOption[];
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedMonth,
  onMonthChange,
  selectedTeacher,
  onTeacherChange,
  teacherOptions = []
}) => {
  const monthOptions = [
    { value: 'all', label: 'Semua Bulan (2026)' },
    { value: '2026-08', label: 'Agustus 2026' },
    { value: '2026-07', label: 'Juli 2026' },
    { value: '2026-06', label: 'Juni 2026' }
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
      <div className="w-full sm:w-72">
        <Input
          icon={Search}
          placeholder="Cari siswa, pengajar, kegiatan..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="w-full sm:w-48 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
          <Select
            options={monthOptions}
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
          />
        </div>

        {teacherOptions.length > 0 && (
          <div className="w-full sm:w-48 flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
            <Select
              options={[{ value: 'all', label: 'Semua Pengajar' }, ...teacherOptions]}
              value={selectedTeacher}
              onChange={(e) => onTeacherChange(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
