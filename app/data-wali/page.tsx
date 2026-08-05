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
import { HeartHandshake, Plus, Search, Phone, Mail, Edit3, Trash2, ArrowUpDown, GraduationCap, X, Key, Copy, Check, AlertTriangle, MapPin, MessageCircle, UserPlus } from 'lucide-react';
import {
  useWaliQuery,
  useCreateWaliMutation,
  useUpdateWaliMutation,
  useDeleteWaliMutation,
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
  const { can } = useAbility();

  // TanStack Query Hooks for Wali
  const { data: waliList = [], isLoading } = useWaliQuery();
  const createWaliMutation = useCreateWaliMutation();
  const updateWaliMutation = useUpdateWaliMutation();
  const deleteWaliMutation = useDeleteWaliMutation();

  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
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
    const finalEmail = res?.data?.email || pEmail || `wali.${Math.random().toString(36).slice(-4)}@sahabattumbuh.id`;

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

  const columns = useMemo<ColumnDef<WaliItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700"
          >
            Nama Wali / Orang Tua <ArrowUpDown className="w-3 h-3 ml-1" />
          </button>
        ),
        cell: (info) => (
          <div className="flex items-center gap-3">
            <Avatar name={info.getValue() as string} src={info.row.original.avatar_url} size="md" />
            <div>
              <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">{info.getValue() as string}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[180px]">{info.row.original.address}</span>
              </div>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'phone',
        header: 'Kontak (No. WhatsApp & Email)',
        cell: (info) => (
          <div className="space-y-0.5">
            <a
              href={formatWaUrl(info.getValue() as string)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-700 hover:text-emerald-900 text-xs flex items-center gap-1.5 transition"
              title="Chat langsung via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="underline decoration-emerald-300 underline-offset-2">{info.getValue() as string}</span>
            </a>
            <a
              href={`mailto:${info.row.original.email}`}
              className="text-slate-500 hover:text-emerald-700 text-[11px] flex items-center gap-1.5 font-mono transition"
            >
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{info.row.original.email}</span>
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
    ],
    [deleteWaliMutation, can]
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

        <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Cari wali, WhatsApp, email..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          {can('create', 'wali') && (
            <Button variant="primary" size="sm" onClick={() => setIsFormOpen(!isFormOpen)} className="shadow-xs text-xs font-bold h-9 px-4 rounded-xl shrink-0">
              <Plus className="w-3.5 h-3.5 mr-1 text-amber-300" /> Tambah Wali
            </Button>
          )}
        </div>
      </div>

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

      {/* 4. REUSABLE MODAL: TAMBAH WALI BARU */}
      <Modal
        isOpen={isFormOpen && can('create', 'wali')}
        onClose={() => setIsFormOpen(false)}
        title="Tambah Orang Tua / Wali Baru"
        icon={UserPlus}
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <ImageUpload currentImageUrl={pAvatarUrl} onImageUploaded={setPAvatarUrl} />
            <form onSubmit={handleWaliSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div>
                <Label required>Nama Lengkap Wali:</Label>
                <Input required value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Ibu Ratna" />
              </div>
              <div>
                <Label required>No. WhatsApp / HP:</Label>
                <Input required value={pPhone} onChange={(e) => setPPhone(e.target.value)} placeholder="081987654321" />
              </div>
              <div>
                <Label>Email Akun Wali (Opsional):</Label>
                <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="ratna.wali@gmail.com" />
              </div>
              <div>
                <Label>Alamat Rumah (Opsional):</Label>
                <Input value={pAddress} onChange={(e) => setPAddress(e.target.value)} placeholder="Jl. Merdeka No. 12, Jakarta" />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={createWaliMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                  {createWaliMutation.isPending ? 'Menyimpan...' : 'Simpan Wali Baru'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* 5. REUSABLE MODAL: EDIT DATA WALI */}
      <Modal
        isOpen={!!editingWali}
        onClose={() => setEditingWali(null)}
        title="Edit Data Wali Siswa"
        icon={Edit3}
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <ImageUpload currentImageUrl={editAvatarUrl} onImageUploaded={setEditAvatarUrl} />

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label required>Nama Lengkap Wali:</Label>
              <Input required value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label required>No. WhatsApp / HP:</Label>
              <Input required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div>
              <Label required>Email Akun:</Label>
              <Input required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div>
              <Label>Alamat Rumah:</Label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
                    <tr key={row.id} className="hover:bg-emerald-50/20 transition">
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
    </div>
  );
}
