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
import { ShieldCheck, Users, Plus, Search, Mail, Phone, Edit3, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X, Key, Copy, Check, AlertTriangle, UserPlus, CheckSquare } from 'lucide-react';
import {
  useStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useBulkDeleteStaffMutation,
  ManagementStaffItem
} from '@/hooks/queries/useStaffQueries';
import { useRoleStore } from '@/stores/useRoleStore';
import { useAbility } from '@/hooks/useAbility';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Modal } from '@/components/atoms/Modal';
import { TablePagination } from '@/components/molecules/TablePagination';
import { SkeletonTable } from '@/components/atoms/Skeleton';
import { ImageUpload } from '@/components/molecules/ImageUpload';

export default function DataStaffPage() {
  const { roles } = useRoleStore();
  const { can } = useAbility();

  const [sorting, setSorting] = useState<SortingState>([]);
  const activeSortBy = sorting[0]?.id;
  const activeSortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  // TanStack Query Hooks for Staff with BE sorting
  const { data: staffList = [], isLoading } = useStaffQuery(activeSortBy, activeSortOrder);
  const createStaffMutation = useCreateStaffMutation();
  const updateStaffMutation = useUpdateStaffMutation();
  const deleteStaffMutation = useDeleteStaffMutation();
  const bulkDeleteStaffMutation = useBulkDeleteStaffMutation();

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const toggleSelectAll = (allList: ManagementStaffItem[]) => {
    if (selectedIds.length === allList.length && allList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allList.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [globalFilter, setGlobalFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<ManagementStaffItem | null>(null);

  // Custom Modal States (No browser native confirm alerts)
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{ name: string; email: string; pass: string; title?: string } | null>(null);
  const [resetTargetStaff, setResetTargetStaff] = useState<ManagementStaffItem | null>(null);
  const [deleteTargetStaff, setDeleteTargetStaff] = useState<ManagementStaffItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form State for Adding Staff
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mAvatarUrl, setMAvatarUrl] = useState('');

  // Form State for Editing Staff
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editRoleTitle, setEditRoleTitle] = useState('');

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res: any = await createStaffMutation.mutateAsync({
      name: mName,
      email: mEmail,
      phone: mPhone,
      avatar_url: mAvatarUrl,
      role_title: 'Staff Administrasi & Keuangan',
      role_id: '44444444-4444-4444-4444-000000000004'
    });

    const generatedPassword = res?.data?.generated_password || res?.generated_password || 'Stf' + Math.random().toString(36).slice(-6) + '!';

    setCreatedAccountInfo({
      name: mName,
      email: mEmail,
      pass: generatedPassword,
      title: 'Akun Supabase Berhasil Dibuat!'
    });

    setMName('');
    setMEmail('');
    setMPhone('');
    setMAvatarUrl('');
    setIsFormOpen(false);
  };

  const confirmResetPassword = async () => {
    if (!resetTargetStaff) return;
    const staff = resetTargetStaff;
    setResetTargetStaff(null);

    const res: any = await updateStaffMutation.mutateAsync({
      id: staff.id,
      reset_password: true
    });

    const newPass = res?.new_password || res?.data?.new_password || 'Stf' + Math.random().toString(36).slice(-6) + '!';
    setCreatedAccountInfo({
      name: staff.name,
      email: staff.email,
      pass: newPass,
      title: 'Password Berhasil Di-reset!'
    });
  };

  const confirmDeleteStaff = async () => {
    if (!deleteTargetStaff) return;
    const id = deleteTargetStaff.id;
    setDeleteTargetStaff(null);
    await deleteStaffMutation.mutateAsync(id);
  };

  const handleCopyPassword = () => {
    if (!createdAccountInfo) return;
    navigator.clipboard.writeText(`Email: ${createdAccountInfo.email}\nPassword: ${createdAccountInfo.pass}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleEditClick = (staff: ManagementStaffItem) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditEmail(staff.email);
    setEditPhone(staff.phone);
    setEditAvatarUrl(staff.avatar_url || '');
    setEditRoleTitle(staff.role_title || staff.role_name || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    await updateStaffMutation.mutateAsync({
      id: editingStaff.id,
      name: editName,
      email: editEmail,
      phone: editPhone,
      avatar_url: editAvatarUrl,
      role_title: editRoleTitle
    });

    setEditingStaff(null);
  };

  const columns = useMemo<ColumnDef<ManagementStaffItem>[]>(() => {
    const cols: ColumnDef<ManagementStaffItem>[] = [];

    if (isBulkMode) {
      cols.push({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={staffList.length > 0 && selectedIds.length === staffList.length}
            onChange={() => toggleSelectAll(staffList)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center">
            <input
              type="checkbox"
              checked={selectedIds.includes(row.original.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelectOne(row.original.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        )
      });
    }

    cols.push(
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700 cursor-pointer"
          >
            <span>Nama Staff</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
            )}
          </button>
        ),
        cell: (info) => (
          <div className="flex items-center gap-3 min-w-0 max-w-[220px]">
            <Avatar name={info.getValue() as string} src={info.row.original.avatar_url} size="md" className="shrink-0" />
            <div className="font-semibold text-slate-900 text-sm group-hover:text-emerald-700 transition truncate min-w-0" title={info.getValue() as string}>
              {info.getValue() as string}
            </div>
          </div>
        )
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700 cursor-pointer"
          >
            <span>Kontak (Email & HP)</span>
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
            )}
          </button>
        ),
        cell: (info) => (
          <div className="space-y-0.5 min-w-0 max-w-[200px]">
            <div className="text-slate-800 font-semibold flex items-center gap-1.5 min-w-0">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate" title={info.getValue() as string}>{info.getValue() as string}</span>
            </div>
            <div className="text-slate-500 text-[11px] flex items-center gap-1.5 min-w-0">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{info.row.original.phone}</span>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'role_name',
        header: 'Assigned Role (Peran)',
        cell: (info) => {
          const matchedRole = roles.find((r) => r.id === info.row.original.role_id);
          const roleLabel = matchedRole?.name || info.getValue() as string;
          return (
            <Badge
              variant={info.row.original.role_id === '11111111-1111-1111-1111-000000000001' ? 'amber' : 'emerald'}
              size="md"
            >
              {roleLabel}
            </Badge>
          );
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => (
          <div className="flex items-center justify-end gap-1">
            {can('update', 'staff') && (
              <button
                onClick={() => setResetTargetStaff(info.row.original)}
                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                title="Reset Password Staff (Generate Password Baru)"
              >
                <Key className="w-4 h-4" />
              </button>
            )}

            {can('update', 'staff') && (
              <button
                onClick={() => handleEditClick(info.row.original)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Edit Data Staff"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {can('delete', 'staff') && info.row.original.role_id !== '11111111-1111-1111-1111-000000000001' && (
              <button
                onClick={() => setDeleteTargetStaff(info.row.original)}
                disabled={deleteStaffMutation.isPending}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                title="Hapus Data Staff"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )
      }
    );
    return cols;
  },
  [roles, deleteStaffMutation, can, isBulkMode, selectedIds, staffList]
);

  const table = useReactTable({
    data: staffList,
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
          <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Data Staff Management & Admin
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              Daftar pengelola tempat les, staff admin, dan perizinan.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Cari staff, email, role..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          {can('create', 'staff') && (
            <div className="flex items-center gap-2 w-full">
              <div className="flex w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isBulkMode) {
                      setIsBulkMode(false);
                      setSelectedIds([]);
                    } else {
                      setIsBulkMode(true);
                    }
                  }}
                  className={`w-full shadow-xs text-xs font-bold h-9 px-3 rounded-xl shrink-0 ${
                    isBulkMode
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  {isBulkMode ? 'Tutup Mode Massal' : 'Pilih Massal'}
                </Button>
              </div>
              <div className="flex w-full">
                <Button variant="primary" size="sm" onClick={() => setIsFormOpen(!isFormOpen)} className="w-full shadow-xs text-xs font-bold h-9 px-4 rounded-xl shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1 text-amber-300" /> Tambah Staff
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-3.5 flex items-center justify-between shadow-lg shadow-rose-100/50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </div>
            <div>
              <div className="text-xs font-bold text-rose-950">
                {selectedIds.length} data staff terpilih
              </div>
              <div className="text-[11px] text-rose-600 font-medium">
                Klik hapus untuk menghapus data staff terpilih secara bersamaan.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="text-slate-600 hover:text-slate-900 text-xs"
            >
              Batal Pilih
            </Button>
            {can('delete', 'staff') && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="font-bold text-xs gap-1.5 shadow-md shadow-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                Hapus {selectedIds.length} Staff Terpilih
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. REUSABLE MODAL: RESET PASSWORD STAFF */}
      <Modal
        isOpen={!!resetTargetStaff}
        onClose={() => setResetTargetStaff(null)}
        title="Konfirmasi Reset Password Staff"
        icon={Key}
        maxWidth="sm"
      >
        {resetTargetStaff && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin membuatkan password acak baru untuk akun staff <strong>{resetTargetStaff.name}</strong> (<span className="font-mono text-slate-800">{resetTargetStaff.email}</span>)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setResetTargetStaff(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={confirmResetPassword} className="h-9 px-4 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                Ya, Reset Password
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. REUSABLE MODAL: KONFIRMASI HAPUS STAFF */}
      <Modal
        isOpen={!!deleteTargetStaff}
        onClose={() => setDeleteTargetStaff(null)}
        title="Konfirmasi Hapus Staff"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        {deleteTargetStaff && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data staff <strong>{deleteTargetStaff.name}</strong> (<span className="font-mono text-slate-800">{deleteTargetStaff.email}</span>)? Akun pengguna dan akses login-nya akan ikut terhapus secara otomatis.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetStaff(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteStaff} className="h-9 px-4 text-xs font-bold rounded-xl shadow-md">
                Ya, Hapus Data Staff
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. REUSABLE MODAL: KREDENSIAL AKUN STAFF */}
      <Modal
        isOpen={!!createdAccountInfo}
        onClose={() => setCreatedAccountInfo(null)}
        title={createdAccountInfo?.title || 'Kredensial Akun Staff'}
        icon={Key}
        maxWidth="sm"
      >
        {createdAccountInfo && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Berikut adalah kredensial akun login untuk <strong>{createdAccountInfo.name}</strong>:
            </p>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Email Akun:</span>
                <p className="font-mono font-bold text-slate-900 text-sm">{createdAccountInfo.email}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Password (Terbaru):</span>
                <p className="font-mono font-bold text-emerald-700 text-base">{createdAccountInfo.pass}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={handleCopyPassword}
                className="w-full justify-center gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 h-9 text-xs font-bold rounded-xl"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                <span>{isCopied ? 'Berhasil Disalin!' : 'Salin Email & Password'}</span>
              </Button>
            </div>

            <div className="pt-2 text-center">
              <Button variant="primary" onClick={() => setCreatedAccountInfo(null)} className="w-full h-9 text-xs font-bold rounded-xl shadow-md">
                Selesai & Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. REUSABLE MODAL: TAMBAH STAFF */}
      <Modal
        isOpen={isFormOpen && can('create', 'staff')}
        onClose={() => setIsFormOpen(false)}
        title="Tambah Staff Management Baru"
        icon={UserPlus}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex justify-center pb-2 border-b border-slate-100">
            <ImageUpload name={mName} currentImageUrl={mAvatarUrl} onImageUploaded={setMAvatarUrl} />
          </div>

          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Nama Lengkap Staff</Label>
                <Input required value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Bapak Ahmad" />
              </div>

              <div>
                <Label required>Email Akun</Label>
                <Input required type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="keuangan@rbst.com" />
              </div>
            </div>

            <div>
              <Label required>No. WhatsApp / HP</Label>
              <Input required value={mPhone} onChange={(e) => setMPhone(e.target.value)} placeholder="081998877665" />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={createStaffMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {createStaffMutation.isPending ? 'Menyimpan...' : 'Simpan Staff'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 5. REUSABLE MODAL: EDIT DATA STAFF */}
      <Modal
        isOpen={!!editingStaff}
        onClose={() => setEditingStaff(null)}
        title="Edit Data Staff Management"
        icon={Edit3}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex justify-center pb-2 border-b border-slate-100">
            <ImageUpload name={editName} currentImageUrl={editAvatarUrl} onImageUploaded={setEditAvatarUrl} />
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Nama Lengkap Staff</Label>
                <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div>
                <Label required>Email Akun</Label>
                <Input required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <Label required>No. WhatsApp / HP</Label>
              <Input required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingStaff(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={updateStaffMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {updateStaffMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>



      {/* TanStack Table dengan Pagination & Skeleton State */}
      {isLoading ? (
        <SkeletonTable rows={4} />
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
                        onClick={() => {
                          if (isBulkMode) {
                            toggleSelectOne(row.original.id);
                          }
                        }}
                        className={`hover:bg-amber-50/20 transition group ${
                          isBulkMode ? 'cursor-pointer' : ''
                        } ${selectedIds.includes(row.original.id) ? 'bg-amber-50/60' : ''}`}
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
                        Tidak ada data staff yang cocok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination table={table} />
          </Card>
        )}

      {/* BULK DELETE MODAL */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Konfirmasi Hapus Banyak Staff"
        icon={AlertTriangle}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin menghapus <strong className="text-slate-900">{selectedIds.length} data staff</strong> terpilih?
            Tindakan ini akan menghapus data staff dan akun penggunanya secara permanen.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={bulkDeleteStaffMutation.isPending}
              onClick={async () => {
                await bulkDeleteStaffMutation.mutateAsync(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
              }}
            >
              {bulkDeleteStaffMutation.isPending ? 'Menghapus...' : `Ya, Hapus ${selectedIds.length} Staff`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
