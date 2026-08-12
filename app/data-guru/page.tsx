'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
import { UserCheck, Plus, Search, Phone, Mail, Edit3, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Eye, Key, Copy, Check, MessageCircle, AlertTriangle, UserPlus, CheckSquare } from 'lucide-react';
import {
  useGuruQuery,
  useCreateGuruMutation,
  useUpdateGuruMutation,
  useDeleteGuruMutation,
  useBulkDeleteGuruMutation,
  TeacherItem
} from '@/hooks/queries/useGuruQueries';
import { useAuthStore } from '@/stores/useAuthStore';
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

export default function DataGuruPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { can } = useAbility();

  const [sorting, setSorting] = useState<SortingState>([]);
  const activeSortBy = sorting[0]?.id;
  const activeSortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  // Role-Based Auto Redirect for Teacher to their own profile page
  useEffect(() => {
    if (user?.role === 'teacher' && user?.teacher_id) {
      router.push(`/data-guru/${user.teacher_id}`);
    }
  }, [user, router]);

  // TanStack Query Hooks for Guru with BE sorting
  const { data: teachers = [], isLoading } = useGuruQuery(activeSortBy, activeSortOrder);
  const createGuruMutation = useCreateGuruMutation();
  const updateGuruMutation = useUpdateGuruMutation();
  const deleteGuruMutation = useDeleteGuruMutation();
  const bulkDeleteGuruMutation = useBulkDeleteGuruMutation();

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const toggleSelectAll = (allList: TeacherItem[]) => {
    if (selectedIds.length === allList.length && allList.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allList.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const [globalFilter, setGlobalFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuru, setEditingGuru] = useState<TeacherItem | null>(null);

  // Photo Upload Loading State for Form Disabling
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Custom Modal States
  const [createdAccountInfo, setCreatedAccountInfo] = useState<{ name: string; email: string; pass: string; title?: string } | null>(null);
  const [resetTargetGuru, setResetTargetGuru] = useState<TeacherItem | null>(null);
  const [deleteTargetGuru, setDeleteTargetGuru] = useState<TeacherItem | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form State for Adding Teacher
  const [tName, setTName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tRate, setTRate] = useState(85000);
  const [tPhoto, setTPhoto] = useState('');
  const [tSubjects, setTSubjects] = useState('Matematika, IPA');

  // Form State for Editing Teacher
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRate, setEditRate] = useState(85000);
  const [editPhoto, setEditPhoto] = useState('');
  const [editSubjects, setEditSubjects] = useState('');

  const generateSlugEmail = (nameStr: string) => {
    const clean = nameStr
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join('.');
    return clean ? `${clean}@rbst.com` : '';
  };

  const handleNameChange = (val: string) => {
    setTName(val);
    const autoEmail = generateSlugEmail(val);
    if (autoEmail) setTEmail(autoEmail);
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingPhoto) return;

    const subjectList = tSubjects
      ? tSubjects.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Umum', 'Pendampingan'];

    const res: any = await createGuruMutation.mutateAsync({
      name: tName,
      email: tEmail,
      phone: tPhone,
      session_rate: Number(tRate),
      photo_url: tPhoto,
      subjects: subjectList
    });

    const generatedPassword = res?.data?.generated_password || res?.generated_password || 'Gru' + Math.random().toString(36).slice(-6) + '!';

    setCreatedAccountInfo({
      name: tName,
      email: tEmail,
      pass: generatedPassword,
      title: 'Akun Supabase Guru Berhasil Dibuat!'
    });

    setTName('');
    setTEmail('');
    setTPhone('');
    setTRate(85000);
    setTPhoto('');
    setTSubjects('Matematika, IPA');
    setIsFormOpen(false);
  };

  const confirmResetPassword = async () => {
    if (!resetTargetGuru) return;
    const guru = resetTargetGuru;
    setResetTargetGuru(null);

    const res: any = await updateGuruMutation.mutateAsync({
      id: guru.id,
      reset_password: true
    });

    const newPass = res?.new_password || res?.data?.new_password || 'Gru' + Math.random().toString(36).slice(-6) + '!';
    setCreatedAccountInfo({
      name: guru.name,
      email: guru.email,
      pass: newPass,
      title: 'Password Guru Berhasil Di-reset!'
    });
  };

  const confirmDeleteGuru = async () => {
    if (!deleteTargetGuru) return;
    const id = deleteTargetGuru.id;
    setDeleteTargetGuru(null);
    await deleteGuruMutation.mutateAsync(id);
  };

  const handleCopyPassword = () => {
    if (!createdAccountInfo) return;
    navigator.clipboard.writeText(`Email: ${createdAccountInfo.email}\nPassword: ${createdAccountInfo.pass}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleEditClick = (guru: TeacherItem) => {
    setEditingGuru(guru);
    setEditName(guru.name);
    setEditEmail(guru.email);
    setEditPhone(guru.phone);
    setEditRate(guru.session_rate || 85000);
    setEditPhoto(guru.photo_url || guru.avatar_url || '');
    setEditSubjects(Array.isArray(guru.subjects) ? guru.subjects.join(', ') : 'Umum, Pendampingan');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuru || isUploadingPhoto) return;

    const subjectList = editSubjects
      ? editSubjects.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Umum', 'Pendampingan'];

    await updateGuruMutation.mutateAsync({
      id: editingGuru.id,
      name: editName,
      email: editEmail,
      phone: editPhone,
      session_rate: Number(editRate),
      photo_url: editPhoto,
      subjects: subjectList
    });

    setEditingGuru(null);
  };

  const columns = useMemo<ColumnDef<TeacherItem>[]>(() => {
    const cols: ColumnDef<TeacherItem>[] = [];

    if (isBulkMode) {
      cols.push({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={teachers.length > 0 && selectedIds.length === teachers.length}
            onChange={() => toggleSelectAll(teachers)}
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
            <span>Foto & Nama Guru</span>
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
          <div className="flex items-center gap-3 min-w-0 max-w-[200px]">
            <Avatar src={info.row.original.photo_url || info.row.original.avatar_url} name={info.getValue() as string} size="md" className="shrink-0" />
            <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition truncate min-w-0" title={info.getValue() as string}>
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
            <span>Kontak (Email & WA)</span>
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
              href={`mailto:${info.getValue()}`}
              className="text-slate-800 font-semibold flex items-center gap-1.5 hover:text-emerald-700 transition min-w-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate" title={info.getValue() as string}>{info.getValue() as string}</span>
            </a>
            <a
              href={formatWaUrl(info.row.original.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1.5 text-[11px] font-mono transition min-w-0"
              onClick={(e) => e.stopPropagation()}
              title="Chat langsung via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="underline decoration-emerald-300 underline-offset-2 truncate">{info.row.original.phone}</span>
            </a>
          </div>
        )
      },
      {
        accessorKey: 'session_rate',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700 cursor-pointer"
          >
            <span>Honor Per Sesi</span>
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
          <span className="font-bold text-emerald-800 font-mono">
            Rp {(info.getValue() as number || 85000).toLocaleString('id-ID')}
          </span>
        )
      },
      {
        accessorKey: 'subjects',
        header: 'Bidang / Subjek',
        cell: (info) => {
          const raw = info.getValue() as string[];
          const subs = Array.isArray(raw) && raw.length > 0 ? raw : ['Umum', 'Pendampingan'];
          return (
            <div className="flex flex-wrap gap-1">
              {subs.map((sub) => (
                <Badge key={sub} variant="slate" size="sm">
                  {sub}
                </Badge>
              ))}
            </div>
          );
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Aksi & Detail</div>,
        cell: (info) => (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/data-guru/${info.row.original.id}`);
              }}
              className="text-xs group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Detail <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>

            {can('update', 'guru') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setResetTargetGuru(info.row.original);
                }}
                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"
                title="Reset Password Guru (Generate Password Baru)"
              >
                <Key className="w-4 h-4" />
              </button>
            )}

            {can('update', 'guru') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(info.row.original);
                }}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Edit Data Guru"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {can('delete', 'guru') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTargetGuru(info.row.original);
                }}
                disabled={deleteGuruMutation.isPending}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                title="Hapus Data Guru"
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
  [router, deleteGuruMutation, can, isBulkMode, selectedIds, teachers]
);

  const table = useReactTable({
    data: teachers,
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
            <UserCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Data Guru & Pengajar Pendamping
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              Daftar pengajar, tarif honor per sesi, dan integrasi akun.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Cari nama guru, email, subjek..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          {can('create', 'guru') && (
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
                  <Plus className="w-3.5 h-3.5 mr-1 text-amber-300" /> Tambah Guru
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
                {selectedIds.length} data guru terpilih
              </div>
              <div className="text-[11px] text-rose-600 font-medium">
                Klik hapus untuk menghapus data guru terpilih secara bersamaan.
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
            {can('delete', 'guru') && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="font-bold text-xs gap-1.5 shadow-md shadow-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                Hapus {selectedIds.length} Guru Terpilih
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. REUSABLE MODAL: RESET PASSWORD GURU */}
      <Modal
        isOpen={!!resetTargetGuru}
        onClose={() => setResetTargetGuru(null)}
        title="Konfirmasi Reset Password Guru"
        icon={Key}
        maxWidth="sm"
      >
        {resetTargetGuru && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin membuatkan password acak baru untuk akun guru <strong>{resetTargetGuru.name}</strong> (<span className="font-mono text-slate-800">{resetTargetGuru.email}</span>)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setResetTargetGuru(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={confirmResetPassword} className="h-9 px-4 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md">
                Ya, Reset Password
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. REUSABLE MODAL: KONFIRMASI HAPUS GURU */}
      <Modal
        isOpen={!!deleteTargetGuru}
        onClose={() => setDeleteTargetGuru(null)}
        title="Konfirmasi Hapus Guru"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        {deleteTargetGuru && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data guru <strong>{deleteTargetGuru.name}</strong> (<span className="font-mono text-slate-800">{deleteTargetGuru.email}</span>)? Akun pengguna dan akses login-nya akan ikut terhapus secara otomatis.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetGuru(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteGuru} className="h-9 px-4 text-xs font-bold rounded-xl shadow-md">
                Ya, Hapus Data Guru
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 3. REUSABLE MODAL: KREDENSIAL AKUN GURU */}
      <Modal
        isOpen={!!createdAccountInfo}
        onClose={() => setCreatedAccountInfo(null)}
        title={createdAccountInfo?.title || 'Kredensial Akun Guru'}
        icon={Key}
        maxWidth="sm"
      >
        {createdAccountInfo && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Berikut adalah kredensial akun login untuk guru <strong>{createdAccountInfo.name}</strong>:
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

      {/* 4. REUSABLE MODAL: TAMBAH GURU */}
      <Modal
        isOpen={isFormOpen && can('create', 'guru')}
        onClose={() => setIsFormOpen(false)}
        title="Tambah Guru Pengajar Baru"
        icon={UserPlus}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-center pb-2 border-b border-slate-100">
            <ImageUpload name={tName} currentImageUrl={tPhoto} onImageUploaded={setTPhoto} onUploadingChange={setIsUploadingPhoto} />
          </div>

          <form onSubmit={handleTeacherSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Nama Lengkap & Gelar</Label>
                <Input required value={tName} onChange={(e) => handleNameChange(e.target.value)} placeholder="Siti Nurhaliza, S.Pd." disabled={isUploadingPhoto} />
              </div>

              <div>
                <Label required>Email Akun Guru</Label>
                <Input required type="email" value={tEmail} onChange={(e) => setTEmail(e.target.value)} placeholder="guru@rbst.com" disabled={isUploadingPhoto} />
              </div>

              <div>
                <Label required>No. WhatsApp / HP</Label>
                <Input required type="number" value={tPhone} onChange={(e) => setTPhone(e.target.value)} placeholder="081234567890" disabled={isUploadingPhoto} />
              </div>

              <div>
                <Label required>Tarif Honor Per Sesi</Label>
                <Input required type="currency" value={tRate} onChange={(e) => setTRate(Number(e.target.value))} placeholder="85.000" disabled={isUploadingPhoto} />
              </div>
            </div>

            <div>
              <Label>Bidang / Subjek Mengajar (Pisahkan Komma)</Label>
              <Input value={tSubjects} onChange={(e) => setTSubjects(e.target.value)} placeholder="Matematika, IPA, Bahasa Indonesia" disabled={isUploadingPhoto} />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} disabled={isUploadingPhoto} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={createGuruMutation.isPending || isUploadingPhoto} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {isUploadingPhoto ? 'Mengunggah Foto...' : createGuruMutation.isPending ? 'Menyimpan...' : 'Simpan Guru Baru'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 5. REUSABLE MODAL: EDIT DATA GURU */}
      <Modal
        isOpen={!!editingGuru}
        onClose={() => !isUploadingPhoto && setEditingGuru(null)}
        title="Edit Data Guru Pengajar"
        icon={Edit3}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-center pb-2 border-b border-slate-100">
            <ImageUpload name={editName} currentImageUrl={editPhoto} onImageUploaded={setEditPhoto} onUploadingChange={setIsUploadingPhoto} />
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label required>Nama Lengkap & Gelar</Label>
                <Input required value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isUploadingPhoto} />
              </div>

              <div>
                <Label required>Email Akun</Label>
                <Input required type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={isUploadingPhoto} />
              </div>

              <div>
                <Label required>No. WhatsApp / HP</Label>
                <Input required type="number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={isUploadingPhoto} />
              </div>

              <div>
                <Label required>Honor Per Sesi</Label>
                <Input required type="currency" value={editRate} onChange={(e) => setEditRate(Number(e.target.value))} disabled={isUploadingPhoto} />
              </div>
            </div>

            <div>
              <Label>Bidang Mengajar (Pisahkan Komma)</Label>
              <Input value={editSubjects} onChange={(e) => setEditSubjects(e.target.value)} disabled={isUploadingPhoto} />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingGuru(null)} disabled={isUploadingPhoto} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={updateGuruMutation.isPending || isUploadingPhoto} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {isUploadingPhoto ? 'Mengunggah Foto...' : updateGuruMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
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
                          } else {
                            router.push(`/data-guru/${row.original.id}`);
                          }
                        }}
                        className={`hover:bg-emerald-50/40 cursor-pointer transition group ${
                          selectedIds.includes(row.original.id) ? 'bg-emerald-50/60' : ''
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
                      Tidak ada data guru yang cocok.
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
        title="Konfirmasi Hapus Banyak Guru"
        icon={AlertTriangle}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin menghapus <strong className="text-slate-900">{selectedIds.length} data guru</strong> terpilih?
            Tindakan ini akan menghapus data guru dan akun penggunanya secara permanen.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={bulkDeleteGuruMutation.isPending}
              onClick={async () => {
                await bulkDeleteGuruMutation.mutateAsync(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
              }}
            >
              {bulkDeleteGuruMutation.isPending ? 'Menghapus...' : `Ya, Hapus ${selectedIds.length} Guru`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
