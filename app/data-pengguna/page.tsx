'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState
} from '@tanstack/react-table';
import { UserCheck, Search, Mail, ArrowUpDown, Check, Power, ShieldAlert } from 'lucide-react';
import { useRoleStore } from '@/stores/useRoleStore';
import {
  useUsersQuery,
  useUpdateUserMutation,
  UserAccountItem
} from '@/hooks/queries/useUsersQueries';
import { toast } from '@/stores/useToastStore';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { TablePagination } from '@/components/molecules/TablePagination';
import { SkeletonTable } from '@/components/atoms/Skeleton';

export default function DataPenggunaPage() {
  const { roles } = useRoleStore();

  // TanStack Query Hooks
  const { data: usersList = [], isLoading } = useUsersQuery();
  const updateUserMutation = useUpdateUserMutation();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Bulk Assign Target Role State
  const [bulkTargetRoleId, setBulkTargetRoleId] = useState(roles[0]?.id || '22222222-2222-2222-2222-000000000002');

  // Single Role Change Handler
  const handleSingleRoleChange = (userId: string, targetRoleId: string) => {
    updateUserMutation.mutate({ userId, role_id: targetRoleId });
  };

  // Toggle Account Active / Inactive Status
  const handleToggleStatus = (user: UserAccountItem) => {
    const nextStatus = user.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    updateUserMutation.mutate({ userId: user.id, status: nextStatus });
  };

  // Bulk Assign Roles Handler
  const handleBulkAssignRole = () => {
    const selectedIndices = Object.keys(rowSelection).map(Number);
    if (selectedIndices.length === 0) return;

    const selectedUsers = selectedIndices.map((idx) => usersList[idx]).filter(Boolean);
    const targetRole = roles.find((r) => r.id === bulkTargetRoleId);
    if (!targetRole) return;

    selectedUsers.forEach((u) => {
      updateUserMutation.mutate({ userId: u.id, role_id: bulkTargetRoleId });
    });

    setRowSelection({});
    toast.success(`Berhasil memperbarui peran (${targetRole.name}) untuk ${selectedUsers.length} pengguna terdaftar!`);
  };

  const columns = useMemo<ColumnDef<UserAccountItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        )
      },
      {
        accessorKey: 'full_name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-xs hover:text-emerald-700"
          >
            Nama & Email Pengguna <ArrowUpDown className="w-3 h-3 ml-1" />
          </button>
        ),
        cell: (info) => (
          <div className="flex items-center gap-3">
            <Avatar name={info.getValue() as string} size="md" />
            <div>
              <div className="font-semibold text-slate-900 text-sm">{info.getValue() as string}</div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Mail className="w-3 h-3" />
                <span>{info.row.original.email}</span>
              </div>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'category',
        header: 'Kategori Entitas',
        cell: (info) => (
          <Badge variant={info.getValue() === 'Pemilik' ? 'amber' : 'emerald'} size="sm">
            {info.getValue() as string}
          </Badge>
        )
      },
      {
        accessorKey: 'role_id',
        header: 'Peran Akun (Assigned Role)',
        cell: (info) => (
          <div className="w-56">
            <Select
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              value={info.getValue() as string}
              onChange={(val) => handleSingleRoleChange(info.row.original.id, val)}
              isSearchable
              isClearable={false}
            />
          </div>
        )
      },
      {
        accessorKey: 'status',
        header: () => <div className="text-center">Status & Kontrol Akun</div>,
        cell: (info) => {
          const isAktif = info.getValue() === 'Aktif';
          return (
            <div className="text-center">
              <button
                type="button"
                onClick={() => handleToggleStatus(info.row.original)}
                title={isAktif ? 'Klik untuk menonaktifkan akun' : 'Klik untuk mengaktifkan akun'}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition transform active:scale-95 cursor-pointer shadow-2xs ${
                  isAktif
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{isAktif ? '● Aktif' : '○ Nonaktif'}</span>
              </button>
            </div>
          );
        }
      }
    ],
    [roles, updateUserMutation]
  );

  const table = useReactTable({
    data: usersList,
    columns,
    state: {
      globalFilter,
      sorting,
      rowSelection
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
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

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-3.5">
      {/* Integrated Header, Search & Bulk Action Toolbar Bar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <UserCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Data Pengguna & Penetapan Peran
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden md:block">
                Kelola peran (Role Assignment) dan status akun terdaftar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Input
                icon={Search}
                placeholder="Cari pengguna, email..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>

            <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold items-center gap-1 shrink-0 hidden lg:flex">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Otomatisasi Akun</span>
            </div>
          </div>
        </div>

        {/* BULK ACTION BAR INTEGRATED */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-2 bg-emerald-50 rounded-xl border border-emerald-200 animate-in fade-in w-full">
            <span className="text-xs font-semibold text-emerald-950 px-2">
              ⚡ {selectedCount} Pengguna Dipilih
            </span>

            <div className="w-48 sm:w-56">
              <Select
                options={roles.map((r) => ({ value: r.id, label: `Assign: ${r.name}` }))}
                value={bulkTargetRoleId}
                onChange={(val) => setBulkTargetRoleId(val)}
                isSearchable
                isClearable={false}
              />
            </div>

            <Button variant="primary" size="sm" onClick={handleBulkAssignRole} className="shadow-xs text-xs">
              <Check className="w-4 h-4 mr-1 text-amber-300" /> Terapkan Role Terpilih
            </Button>
          </div>
        )}
      </div>

      {/* TanStack Table dengan Skeleton State */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : (
        <Card className="p-0 overflow-hidden bg-white shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-slate-50 border-b border-slate-200">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-3.5 py-2.5 text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-emerald-50/30 transition ${
                        row.getIsSelected() ? 'bg-emerald-50/60 font-semibold' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3.5 py-2.5 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-slate-400">
                      Tidak ada data pengguna yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination table={table} />
        </Card>
      )}
    </div>
  );
}
