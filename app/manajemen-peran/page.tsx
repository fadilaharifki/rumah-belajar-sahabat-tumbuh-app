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
  SortingState
} from '@tanstack/react-table';
import { ShieldCheck, Plus, Search, Check, Edit3, Trash2, ArrowUpDown, X, Folder, CheckSquare, Square, Save } from 'lucide-react';
import {
  useRolesQuery,
  useCreateRoleMutation,
  useUpdateRolePermissionsMutation,
  useDeleteRoleMutation
} from '@/hooks/queries/useRolesQueries';
import { RoleItem, ALL_CRUD_PERMISSIONS } from '@/stores/useRoleStore';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Modal } from '@/components/atoms/Modal';
import { TablePagination } from '@/components/molecules/TablePagination';
import { SkeletonTable } from '@/components/atoms/Skeleton';

// Hierarchical Grouped CRUD Permissions Definition
export const PERMISSION_GROUPS = [
  {
    name: 'Dashboard Utama',
    items: [
      { key: 'dashboard:read', label: 'Melihat Dashboard Utama (Read)' }
    ]
  },
  {
    name: 'Presensi & Check-In AI',
    items: [
      { key: 'presensi:read', label: 'Melihat Lembar Presensi (Read)' },
      { key: 'presensi:create', label: 'Check-In Presensi AI (Create)' },
      { key: 'presensi:update', label: 'Mengedit Status Presensi (Update)' },
      { key: 'presensi:delete', label: 'Menghapus Data Presensi (Delete)' }
    ]
  },
  {
    name: 'Jadwal Ngajar & Sesi',
    items: [
      { key: 'jadwal:read', label: 'Melihat Jadwal Ngajar (Read)' },
      { key: 'jadwal:create', label: 'Menambah Sesi Jadwal Baru (Create)' },
      { key: 'jadwal:update', label: 'Mengedit Jam & Pengajar (Update)' },
      { key: 'jadwal:delete', label: 'Menghapus Sesi Jadwal (Delete)' }
    ]
  },
  {
    name: 'Data Guru / Pengajar',
    items: [
      { key: 'guru:read', label: 'Melihat Data Guru (Read)' },
      { key: 'guru:create', label: 'Menambah Guru Baru (Create)' },
      { key: 'guru:update', label: 'Mengedit Data Guru (Update)' },
      { key: 'guru:delete', label: 'Menghapus Data Guru (Delete)' }
    ]
  },
  {
    name: 'Data Siswa Bimbingan',
    items: [
      { key: 'siswa:read', label: 'Melihat Data Siswa (Read)' },
      { key: 'siswa:create', label: 'Menambah Siswa Baru (Create)' },
      { key: 'siswa:update', label: 'Mengedit & Catatan Progress (Update)' },
      { key: 'siswa:delete', label: 'Menghapus Data Siswa (Delete)' }
    ]
  },
  {
    name: 'Data Wali Siswa',
    items: [
      { key: 'wali:read', label: 'Melihat Data Wali (Read)' },
      { key: 'wali:create', label: 'Menambah Wali Baru (Create)' },
      { key: 'wali:update', label: 'Mengedit Data Wali (Update)' },
      { key: 'wali:delete', label: 'Menghapus Data Wali (Delete)' }
    ]
  },
  {
    name: 'Data Staff Management',
    items: [
      { key: 'staff:read', label: 'Melihat Data Staff (Read)' },
      { key: 'staff:create', label: 'Menambah Staff Baru (Create)' },
      { key: 'staff:update', label: 'Mengedit Data Staff (Update)' },
      { key: 'staff:delete', label: 'Menghapus Data Staff (Delete)' }
    ]
  },
  {
    name: 'Penggajian & Keuangan',
    items: [
      { key: 'penggajian:read', label: 'Melihat Rekap Payroll (Read)' },
      { key: 'penggajian:export', label: 'Export Laporan PDF (Export)' }
    ]
  },
  {
    name: 'Manajemen Peran (RBAC)',
    items: [
      { key: 'roles:manage', label: 'Atur Peran & Ability (Manage)' }
    ]
  }
];

export default function ManajemenPeranPage() {
  // TanStack Query Hooks
  const { data: roles = [], isLoading } = useRolesQuery();
  const createRoleMutation = useCreateRoleMutation();
  const updatePermissionsMutation = useUpdateRolePermissionsMutation();
  const deleteRoleMutation = useDeleteRoleMutation();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);

  // Form State for creating new role
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<string[]>(['guru:read', 'siswa:read']);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    await createRoleMutation.mutateAsync({
      name: newRoleName,
      description: newRoleDesc || 'Peran kustom buatan admin',
      permissions: newRolePerms
    });

    setNewRoleName('');
    setNewRoleDesc('');
    setNewRolePerms(['guru:read', 'siswa:read']);
    setIsFormOpen(false);
  };

  // Master Select All for Form Create Role
  const allPermKeys = ALL_CRUD_PERMISSIONS.map((p) => p.key);
  const isFormAllSelected = allPermKeys.every((k) => newRolePerms.includes(k));

  const handleFormSelectAll = () => {
    if (isFormAllSelected) {
      setNewRolePerms([]);
    } else {
      setNewRolePerms(allPermKeys);
    }
  };

  // Section Select All for Form Create Role
  const handleFormSelectSection = (groupItems: { key: string }[]) => {
    const groupKeys = groupItems.map((i) => i.key);
    const allSectionSelected = groupKeys.every((k) => newRolePerms.includes(k));

    if (allSectionSelected) {
      setNewRolePerms((prev) => prev.filter((k) => !groupKeys.includes(k)));
    } else {
      setNewRolePerms((prev) => Array.from(new Set([...prev, ...groupKeys])));
    }
  };

  const handleFormToggleItem = (permKey: string) => {
    setNewRolePerms((prev) =>
      prev.includes(permKey) ? prev.filter((k) => k !== permKey) : [...prev, permKey]
    );
  };

  // Local State Toggle for Modal Permission (No API Request On Checkbox Toggle)
  const toggleModalPermission = (permKey: string) => {
    if (!editingRole || editingRole.id === '11111111-1111-1111-1111-000000000001') return;

    const hasPerm = editingRole.permissions.includes(permKey);
    const updatedPerms = hasPerm
      ? editingRole.permissions.filter((p) => p !== permKey)
      : [...editingRole.permissions, permKey];

    setEditingRole({ ...editingRole, permissions: updatedPerms });
  };

  // Local State Section Toggle for Modal Permission
  const toggleGroupAll = (groupItems: { key: string }[]) => {
    if (!editingRole || editingRole.id === '11111111-1111-1111-1111-000000000001') return;

    const groupKeys = groupItems.map((item) => item.key);
    const allChecked = groupKeys.every((k) => editingRole.permissions.includes(k));

    let updatedPerms: string[];
    if (allChecked) {
      updatedPerms = editingRole.permissions.filter((k) => !groupKeys.includes(k));
    } else {
      const added = groupKeys.filter((k) => !editingRole.permissions.includes(k));
      updatedPerms = [...editingRole.permissions, ...added];
    }

    setEditingRole({ ...editingRole, permissions: updatedPerms });
  };

  // Batch Save Handler: Only sends network request when clicking "Simpan Ability"
  const handleSaveAbilities = async () => {
    if (!editingRole) return;

    await updatePermissionsMutation.mutateAsync({
      roleId: editingRole.id,
      permissions: editingRole.permissions
    });

    setEditingRole(null);
  };

  const columns = useMemo<ColumnDef<RoleItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-xs hover:text-emerald-700"
          >
            Nama Peran (Role) <ArrowUpDown className="w-3 h-3 ml-1" />
          </button>
        ),
        cell: (info) => (
          <div className="font-semibold text-slate-900 text-sm">{info.getValue() as string}</div>
        )
      },
      {
        accessorKey: 'description',
        header: 'Deskripsi Hak Akses',
        cell: (info) => <div className="text-slate-600 text-xs">{info.getValue() as string}</div>
      },
      {
        accessorKey: 'permissions',
        header: 'Total Izin Terpasang',
        cell: (info) => {
          const perms = (info.getValue() as string[]) || [];
          return (
            <Badge variant={perms.length > 10 ? 'emerald' : 'amber'} size="sm">
              ⚡ {perms.length} CRUD Abilities
            </Badge>
          );
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Aksi & Atur Ability</div>,
        cell: (info) => (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRole(info.row.original)}
              className="text-xs font-semibold"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Atur Ability (Tree)
            </Button>

            {info.row.original.id !== '11111111-1111-1111-1111-000000000001' && (
              <button
                onClick={() => deleteRoleMutation.mutate(info.row.original.id)}
                disabled={deleteRoleMutation.isPending}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                title="Hapus Role"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      }
    ],
    [deleteRoleMutation]
  );

  const table = useReactTable({
    data: roles,
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
    <div className="space-y-3.5">
      {/* Integrated Header & Search Toolbar Bar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Manajemen Peran Kustom & Access Control (RBAC)
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              Atur peran kustom baru dan centang modul ability perizinan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Cari peran, deskripsi..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          <Button variant="primary" size="sm" onClick={() => setIsFormOpen(!isFormOpen)} className="shadow-xs text-xs font-bold h-9 px-4 rounded-xl shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1 text-amber-300" /> Tambah Role
          </Button>
        </div>
      </div>      {/* 1. REUSABLE MODAL: BUAT ROLE KUSTOM BARU */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Form Buat Role Kustom Baru"
        icon={ShieldCheck}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Pilih Hak Akses (Ability) Peran:</span>
            {/* MASTER SELECT ALL BUTTON */}
            <button
              type="button"
              onClick={handleFormSelectAll}
              className="px-3 py-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              {isFormAllSelected ? (
                <>
                  <Square className="w-3.5 h-3.5 text-amber-300" /> Hapus Semua Centang
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-amber-300" /> Pilih Semua Ability ({allPermKeys.length})
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label required className="text-xs font-bold text-slate-700 mb-1">Nama Peran Baru:</Label>
                <Input required value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Misal: Guru Piket / Pendamping Lapangan" />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-700 mb-1">Deskripsi Peran:</Label>
                <Input value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} placeholder="Penjelasan singkat hak akses..." />
              </div>
            </div>

            {/* SECTION-BY-SECTION ABILITY CHECKBOXES */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PERMISSION_GROUPS.map((group) => {
                  const groupKeys = group.items.map((i) => i.key);
                  const isGroupAllSelected = groupKeys.every((k) => newRolePerms.includes(k));

                  return (
                    <div key={group.name} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      <div className="p-2.5 bg-slate-100/90 flex items-center justify-between border-b border-slate-200">
                        <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{group.name}</span>
                        </span>

                        {/* SECTION SELECT ALL TOGGLE */}
                        <button
                          type="button"
                          onClick={() => handleFormSelectSection(group.items)}
                          className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-slate-200"
                        >
                          {isGroupAllSelected ? 'Batal Centang' : '✓ Select Section'}
                        </button>
                      </div>

                      <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/50">
                        {group.items.map((item) => {
                          const isChecked = newRolePerms.includes(item.key);
                          return (
                            <label
                              key={item.key}
                              className={`flex items-center gap-2 p-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${
                                isChecked
                                  ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleFormToggleItem(item.key)}
                                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="truncate">{item.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={createRoleMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {createRoleMutation.isPending ? 'Menyimpan...' : 'Simpan Role Baru'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 2. REUSABLE MODAL: EDIT ABILITY TERPASANG */}
      <Modal
        isOpen={!!editingRole}
        onClose={() => setEditingRole(null)}
        title={editingRole ? `Edit Ability Terpasang — ${editingRole.name}` : 'Edit Ability'}
        icon={ShieldCheck}
        maxWidth="2xl"
      >
        {editingRole && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Centang modul ability yang diinginkan, lalu klik <strong>Simpan Ability Peran</strong> di bawah.
            </p>

            <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
              {PERMISSION_GROUPS.map((group) => {
                const groupKeys = group.items.map((i) => i.key);
                const allChecked = groupKeys.every((k) => editingRole.permissions.includes(k));

                return (
                  <div key={group.name} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="p-2.5 bg-slate-100/80 flex items-center justify-between border-b border-slate-200">
                      <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{group.name}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleGroupAll(group.items)}
                        disabled={editingRole.id === '11111111-1111-1111-1111-000000000001'}
                        className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer disabled:opacity-50"
                      >
                        {allChecked ? 'Batal Pilih Semua' : '✓ Pilih Semua Modul Ini'}
                      </button>
                    </div>

                    <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                      {group.items.map((item) => {
                        const isChecked = editingRole.permissions.includes(item.key);
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-2 p-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${
                              isChecked
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={editingRole.id === '11111111-1111-1111-1111-000000000001'}
                              onChange={() => toggleModalPermission(item.key)}
                              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="truncate">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BATCH SAVE BUTTON CONTAINER */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setEditingRole(null)}
                disabled={updatePermissionsMutation.isPending}
                className="h-9 px-4 text-xs font-bold rounded-xl"
              >
                Batal
              </Button>

              <Button
                variant="primary"
                size="sm"
                type="button"
                onClick={handleSaveAbilities}
                disabled={updatePermissionsMutation.isPending}
                className="shadow-md font-bold text-xs h-9 px-5 rounded-xl"
              >
                <Save className="w-3.5 h-3.5 mr-1 text-amber-300" />
                <span>
                  {updatePermissionsMutation.isPending ? 'Menyimpan Ability...' : 'Simpan Ability Peran'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
