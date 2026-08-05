import React from 'react';
import { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: number[];
}

export function TablePagination<TData>({
  table,
  pageSizeOptions = [5, 10, 20, 50]
}: TablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalPages = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3.5 py-2 bg-slate-50/90 border-t border-slate-200/80 text-xs font-semibold text-slate-600">
      {/* Total Rows Counter & Page Size Selector */}
      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
        <span className="text-slate-500">
          Menampilkan <strong className="text-slate-900">{totalRows > 0 ? pageIndex * pageSize + 1 : 0}</strong> -{' '}
          <strong className="text-slate-900">{Math.min((pageIndex + 1) * pageSize, totalRows)}</strong> dari{' '}
          <strong className="text-emerald-800 font-bold">{totalRows}</strong> Data
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <select
            value={pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-8 px-2.5 text-xs font-bold text-slate-800 border border-slate-200/90 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / hlm
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination Navigation Buttons */}
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
        <span className="text-slate-500 font-medium mr-1 text-xs">
          Halaman <strong className="text-slate-900">{pageIndex + 1}</strong> dari <strong className="text-slate-900">{totalPages || 1}</strong>
        </span>

        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
          title="Halaman Pertama"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
          title="Halaman Selanjutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => table.setPageIndex(totalPages - 1)}
          disabled={!table.getCanNextPage()}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
          title="Halaman Terakhir"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
