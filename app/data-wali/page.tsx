'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Users, Plus, Search, Phone, Mail, MapPin, Eye, Edit3, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Key, Copy, Check, MessageCircle, AlertTriangle, UserPlus, CheckSquare, GraduationCap, HeartHandshake } from 'lucide-react';
import {
  useWaliQuery,
  useCreateWaliMutation,
  useUpdateWaliMutation,
  useDeleteWaliMutation,
  useBulkDeleteWaliMutation,
  WaliItem
} from '@/hooks/queries/useWaliQueries';
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
import { formatWaUrl } from '@/utils/formatters';

export default function DataWaliPage() {
  const router = useRouter();
  const { can } = useAbility();

  const [sorting, setSorting] = useState<SortingState>([]);
  const activeSortBy = sorting[0]?.id;
  const activeSortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  // TanStack Query Hooks for Wali with BE sorting
  const { data: waliList = [], isLoading } = useWaliQuery(activeSortBy, activeSortOrder);
  const createWaliMutation = useCreateWaliMutation();
  const updateWaliMutation = useUpdateWaliMutation();
  const deleteWaliMutation = useDeleteWaliMutation();
  const bulkDeleteWaliMutation = useBulkDeleteWaliMutation();

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const toggleSelectAll = (allList: WaliItem[]) => {
    if (selectedIds.length === allList.length && allList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allList.map((w) => w.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [globalFilter, setGlobalFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWali, setEditingWali] = useState<WaliItem | null>(null);

  // Custom Modal States
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{ name: string; email: string; pass: string; title?: string } | null>(null);
  const [resetTargetWali, setResetTargetWali] = useState<WaliItem | null>(null);
  const [deleteTargetWali, setDeleteTargetWali] = useState<WaliItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form State for Adding Parent (Wali)
  const [pName, setPName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pAvatarUrl, setPAvatarUrl] = useState('');

  // Form State for Editing Parent (Wali)
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  const handleWaliSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res: any = await createWaliMutation.mutateAsync({
      name: pName,
      phone: pPhone,
      email: pEmail || undefined,
      address: pAddress || undefined,
      avatar_url: pAvatarUrl || undefined
    });

    const generatedPassword = res?.data?.generated_password || res?.generated_password || 'Wli' + Math.random().toString(36).slice(-6) + '!';
    const finalEmail = res?.data?.email || pEmail || `wali.${Math.random().toString(36).slice(-4)}@rbst.com`;

    setCreatedAccountInfo({
      name: pName,
      email: finalEmail,
      pass: generatedPassword,
      title: 'Akun Supabase Wali Berhasil Dibuat!'
    });

    setPName('');
    setPPhone('');
    setPEmail('');
    setPAddress('');
    setPAvatarUrl('');
    setIsFormOpen(false);
  };

  const confirmResetPassword = async () => {
    if (!resetTargetWali) return;
    const wali = resetTargetWali;
    setResetTargetWali(null);

    const res: any = await updateWaliMutation.mutateAsync({
      id: wali.id,
      reset_password: true
    });

    const newPass = res?.new_password || res?.data?.new_password || 'Wli' + Math.random().toString(36).slice(-6) + '!';
    setCreatedAccountInfo({
      name: wali.name,
      email: wali.email,
      pass: newPass,
      title: 'Password Wali Berhasil Di-reset!'
    });
  };

  const confirmDeleteWali = async () => {
    if (!deleteTargetWali) return;
    const id = deleteTargetWali.id;
    setDeleteTargetWali(null);
    await deleteWaliMutation.mutateAsync(id);
  };

  const handleCopyPassword = () => {
    if (!createdAccountInfo) return;
    navigator.clipboard.writeText(`Email: ${createdAccountInfo.email}\nPassword: ${createdAccountInfo.pass}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleEditClick = (wali: WaliItem) => {
    setEditingWali(wali);
    setEditName(wali.name);
    setEditPhone(wali.phone);
    setEditEmail(wali.email);
    setEditAddress(wali.address);
    setEditAvatarUrl(wali.avatar_url || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWali) return;

    await updateWaliMutation.mutateAsync({
      id: editingWali.id,
      name: editName,
      phone: editPhone,
      email: editEmail,
      address: editAddress,
      avatar_url: editAvatarUrl
    });

    setEditingWali(null);
  };

  const columns = useMemo<ColumnDef<WaliItem>[]>(() => {
    const cols: ColumnDef<WaliItem>[] = [];

    if (isBulkMode) {
      cols.push({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={waliList.length > 0 && selectedIds.length === waliList.length}
            onChange={() => toggleSelectAll(waliList)}
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
            <span>Nama Wali / Orang Tua</span>
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
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition truncate" title={info.getValue() as string}>
                {info.getValue() as string}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 min-w-0">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[170px]" title={info.row.original.address}>{info.row.original.address}</span>
              </div>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'phone',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700 cursor-pointer"
          >
            <span>Kontak (No. WA & Email)</span>
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
            <a
              href={formatWaUrl(info.getValue() as string)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 hover:text-emerald-900 text-xs flex items-center gap-1.5 transition min-w-0"
              title="Chat langsung via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="underline decoration-emerald-300 underline-offset-2 truncate">{info.getValue() as string}</span>
            </a>
            <a
              href={`mailto:${info.row.original.email}`}
              className="text-slate-500 hover:text-emerald-700 text-[11px] flex items-center gap-1.5 font-mono transition min-w-0"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate" title={info.row.original.email}>{info.row.original.email}</span>
            </a>
          </div>
        )
      },
      {
        accessorKey: 'studentCount',
        header: 'Jumlah Anak Bimbingan',
        cell: (info) => (
          <div className="flex items-center gap-1.5">
            <Badge variant="amber" size="md" className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-amber-800" />
              <span>{info.getValue() as number} Anak</span>
            </Badge>
          </div>
        )
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => (
          <div className="flex items-center justify-end gap-1">
            {can('update', 'wali') && (
              <button
                onClick={() => setResetTargetWali(info.row.original)}
                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                title="Reset Password Wali (Generate Password Baru)"
              >
                <Key className="w-4 h-4" />
              </button>
            )}

            {can('update', 'wali') && (
              <button
                onClick={() => handleEditClick(info.row.original)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Edit Data Wali"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {can('delete', 'wali') && (
              <button
                onClick={() => setDeleteTargetWali(info.row.original)}
                disabled={deleteWaliMutation.isPending}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                title="Hapus Data Wali"
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
  [deleteWaliMutation, can, isBulkMode, selectedIds, waliList]
);

  const table = useReactTable({
    data: waliList,
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
            <HeartHandshake className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Data Orang Tua / Wali Siswa
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              Daftar kontak orang tua, WhatsApp wali, dan keterikatan siswa.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Cari wali, WhatsApp, email..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          {can('create', 'wali') && (
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
                  <Plus className="w-3.5 h-3.5 mr-1 text-amber-300" /> Tambah Wali
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
                {selectedIds.length} data wali terpilih
              </div>
              <div className="text-[11px] text-rose-600 font-medium">
                Klik hapus untuk menghapus data wali terpilih secara bersamaan.
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
            {can('delete', 'wali') && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="font-bold text-xs gap-1.5 shadow-md shadow-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                Hapus {selectedIds.length} Wali Terpilih
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. REUSABLE MODAL: RESET PASSWORD WALI */}
      <Modal
        isOpen={!!resetTargetWali}
        onClose={() => setResetTargetWali(null)}
        title="Konfirmasi Reset Password Wali"
        icon={Key}
        maxWidth="sm"
      >
        {resetTargetWali && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin membuatkan password acak baru untuk akun wali <strong>{resetTargetWali.name}</strong> (<span className="font-mono text-slate-800">{resetTargetWali.email}</span>)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setResetTargetWali(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={confirmResetPassword} className="h-9 px-4 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                Ya, Reset Password
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. REUSABLE MODAL: KONFIRMASI HAPUS WALI */}
      <Modal
        isOpen={!!deleteTargetWali}
        onClose={() => setDeleteTargetWali(null)}
        title="Konfirmasi Hapus Wali"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        {deleteTargetWali && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data wali <strong>{deleteTargetWali.name}</strong> (<span className="font-mono text-slate-800">{deleteTargetWali.email}</span>)? Akun pengguna dan akses login-nya akan ikut terhapus secara otomatis.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetWali(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteWali} className="h-9 px-4 text-xs font-bold rounded-xl shadow-md">
                Ya, Hapus Data Wali
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. REUSABLE MODAL: KREDENSIAL AKUN WALI */}
      <Modal
        isOpen={!!createdAccountInfo}
        onClose={() => setCreatedAccountInfo(null)}
        title={createdAccountInfo?.title || 'Kredensial Akun Wali'}
        icon={Key}
        maxWidth="sm"
      >
        {createdAccountInfo && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Berikut adalah kredensial akun login untuk wali <strong>{createdAccountInfo.name}</strong>:
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

      {/* 4. REUSABLE MODAL: TAMBAH WALI */}
      <Modal
        isOpen={isFormOpen && can('create', 'wali')}
        onClose={() => setIsFormOpen(false)}
        title="Tambah Orang Tua / Wali Baru"
        icon={UserPlus}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-center pb-2 border-b border-slate-100">
            <ImageUpload name={pName} currentImageUrl={pAvatarUrl} onImageUploaded={setPAvatarUrl} />
          </div>

          <form onSubmit={handleWaliSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Nama Lengkap Wali</Label>
                <Input required value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Ibu Ratna" />
              </div>

              <div>
                <Label required>No. WhatsApp / HP</Label>
                <Input required value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="081987654321" />
              </div>

              <div>
                <Label>Email Akun Wali (Opsional)</Label>
                <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="ratna.wali@gmail.com" />
              </div>

              <div>
                <Label>Alamat Rumah (Opsional)</Label>
                <Input value={pAddress} onChange={(e) => setPAddress(e.target.value)} placeholder="Jl. Merdeka No. 12, Jakarta" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={createWaliMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {createWaliMutation.isPending ? 'Menyimpan...' : 'Simpan Wali Baru'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 5. REUSABLE MODAL: EDIT DATA WALI */}
      <Modal
        isOpen={!!editingWali}
        onClose={() => setEditingWali(null)}
        title="Edit Data Wali Siswa"
        icon={Edit3}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-center pb-2 border-b border-slate-100">
            <ImageUpload name={editName} currentImageUrl={editAvatarUrl} onImageUploaded={setEditAvatarUrl} />
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Nama Lengkap Wali</Label>
                <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div>
                <Label required>No. WhatsApp / HP</Label>
                <Input required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>

              <div>
                <Label>Email Akun</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>

              <div>
                <Label>Alamat Rumah</Label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingWali(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={updateWaliMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {updateWaliMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
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
                      className={`hover:bg-emerald-50/20 transition ${
                        isBulkMode ? 'cursor-pointer' : ''
                      } ${selectedIds.includes(row.original.id) ? 'bg-emerald-50/60' : ''}`}
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
                      Tidak ada data wali yang cocok.
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
        title="Konfirmasi Hapus Banyak Wali"
        icon={AlertTriangle}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin menghapus <strong className="text-slate-900">{selectedIds.length} data wali</strong> terpilih?
            Tindakan ini akan menghapus data wali dan akun penggunanya secara permanen.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={bulkDeleteWaliMutation.isPending}
              onClick={async () => {
                await bulkDeleteWaliMutation.mutateAsync(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
              }}
            >
              {bulkDeleteWaliMutation.isPending ? 'Menghapus...' : `Ya, Hapus ${selectedIds.length} Wali`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
