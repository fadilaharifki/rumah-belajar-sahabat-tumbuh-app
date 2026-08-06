import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState
} from '@tanstack/react-table';
import { ArrowUpDown, Calendar, UserCheck, GraduationCap, ShieldCheck, Printer } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Avatar } from '../atoms/Avatar';
import { Badge } from '../atoms/Badge';
import { SearchFilterBar } from '../molecules/SearchFilterBar';
import { TablePagination } from '../molecules/TablePagination';
import { formatDateIndonesian } from '@/utils/formatters';
import { SessionLog } from '@/hooks/useSessions';

export interface SessionTableProps {
  logs: SessionLog[];
  onPrintClick?: () => void;
}

export const SessionTable: React.FC<SessionTableProps> = ({ logs = [], onPrintClick }) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Filter logs by month and teacher
  const filteredData = useMemo(() => {
    return logs.filter((item) => {
      if (selectedMonth !== 'all' && !item.session_date.startsWith(selectedMonth)) {
        return false;
      }
      if (selectedTeacher !== 'all' && item.teacher_id !== selectedTeacher) {
        return false;
      }
      return true;
    });
  }, [logs, selectedMonth, selectedTeacher]);

  const columns = useMemo<ColumnDef<SessionLog>[]>(
    () => [
      {
        accessorKey: 'session_date',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700"
          >
            <Calendar className="w-3.5 h-3.5" /> Tanggal & Jam
            <ArrowUpDown className="w-3 h-3 ml-1" />
          </button>
        ),
        cell: (info) => (
          <div className="space-y-0.5">
            <div className="font-bold text-slate-900 text-xs">
              {formatDateIndonesian(info.getValue() as string)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {info.row.original.start_time} - {info.row.original.end_time} WIB
            </div>
            {info.row.original.verified && (
              <Badge variant="emerald" size="sm" className="mt-1">
                <ShieldCheck className="w-3 h-3 mr-0.5" /> Terverifikasi
              </Badge>
            )}
          </div>
        )
      },
      {
        accessorKey: 'teacher_name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700"
          >
            <UserCheck className="w-3.5 h-3.5" /> Pengajar
            <ArrowUpDown className="w-3 h-3 ml-1" />
          </button>
        ),
        cell: (info) => (
          <div className="flex items-center gap-2.5">
            <Avatar name={info.getValue() as string} size="sm" />
            <div>
              <div className="font-bold text-slate-900 text-xs">{info.getValue() as string}</div>
              <div className="text-[10px] text-emerald-700 font-semibold">Pengajar Pendamping</div>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'student_name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700"
          >
            <GraduationCap className="w-3.5 h-3.5" /> Siswa
            <ArrowUpDown className="w-3 h-3 ml-1" />
          </button>
        ),
        cell: (info) => (
          <div className="font-bold text-slate-800 text-xs bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 inline-block">
            {info.getValue() as string}
          </div>
        )
      },
      {
        accessorKey: 'activities',
        header: 'Kegiatan',
        cell: (info) => (
          <p className="text-xs text-slate-700 leading-relaxed font-normal max-w-xs">
            {info.getValue() as string}
          </p>
        )
      },
      {
        accessorKey: 'results_recommendations',
        header: 'Hasil & Rekomendasi',
        cell: (info) => (
          <p className="text-xs text-slate-700 leading-relaxed font-normal max-w-xs bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/80">
            {info.getValue() as string}
          </p>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      globalFilter,
      sorting
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  return (
    <div className="space-y-4">
      {/* Controls & Print Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:flex-1">
          <SearchFilterBar
            searchTerm={globalFilter}
            onSearchChange={setGlobalFilter}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            selectedTeacher={selectedTeacher}
            onTeacherChange={setSelectedTeacher}
          />
        </div>

        {onPrintClick && (
          <Button
            variant="secondary"
            size="md"
            onClick={onPrintClick}
            className="w-full sm:w-auto font-bold shadow-md shrink-0"
          >
            <Printer className="w-4 h-4 mr-1.5 text-slate-950" /> Cetak Lembar Fisik
          </Button>
        )}
      </div>

      {/* TanStack Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="bg-slate-50/80 border-b border-slate-200/80">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-emerald-50/30 transition duration-150">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-slate-400 text-sm">
                    Belum ada data lembar sesi pendampingan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* TanStack Table Pagination */}
        <TablePagination table={table} />
      </div>
    </div>
  );
};
