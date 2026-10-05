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
import { ShieldCheck, UserPlus, Search, Phone, Eye, Edit3, Trash2, ArrowUpDown, ArrowUp, ArrowDown, User, CheckSquare, AlertTriangle, ChevronRight, Filter, GraduationCap, Plus, ClipboardList, RotateCcw, Archive } from 'lucide-react';
import {
  useSiswaQuery,
  useInfiniteSiswaQuery,
  useCreateSiswaMutation,
  useUpdateSiswaMutation,
  useDeleteSiswaMutation,
  useBulkDeleteSiswaMutation,
  useRestoreSiswaMutation,
  StudentItem
} from '@/hooks/queries/useSiswaQueries';
import { useWaliQuery } from '@/hooks/queries/useWaliQueries';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAbility } from '@/hooks/useAbility';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { Modal } from '@/components/atoms/Modal';
import { TablePagination } from '@/components/molecules/TablePagination';
import { SkeletonTable, Skeleton } from '@/components/atoms/Skeleton';
import { ImageUpload } from '@/components/molecules/ImageUpload';
import { RichTextEditor } from '@/components/molecules/RichTextEditor';
import { formatWaUrl } from '@/utils/formatters';

function formatRichContent(text?: string): string {
  if (!text) return '-';
  const hasHtml = /<[a-z][\s\S]*>/i.test(text);
  if (hasHtml) return text;
  return text.replace(/\n/g, '<br />');
}

export default function DataSiswaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { can } = useAbility();

  const [sorting, setSorting] = useState<SortingState>([]);
  const activeSortBy = sorting[0]?.id;
  const activeSortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Aktif' | 'Nonaktif' | 'Terhapus'>('Semua');

  // TanStack Query Hooks for Siswa & Wali with BE sorting & status filter
  const backendStatus = statusFilter === 'Terhapus' ? 'Terhapus' : undefined;
  const { data: allStudents = [], isLoading } = useSiswaQuery(activeSortBy, activeSortOrder, backendStatus);
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteSiswaQuery(6);

  const { data: parents = [] } = useWaliQuery();

  const parentOptions = useMemo(() => {
    return parents.map((p) => ({
      value: p.id,
      label: p.name,
      subLabel: p.phone
    }));
  }, [parents]);

  const createSiswaMutation = useCreateSiswaMutation();
  const updateSiswaMutation = useUpdateSiswaMutation();
  const deleteSiswaMutation = useDeleteSiswaMutation();
  const restoreSiswaMutation = useRestoreSiswaMutation();

  const [globalFilter, setGlobalFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentItem | null>(null);
  const [deleteTargetStudent, setDeleteTargetStudent] = useState<StudentItem | null>(null);

  // Photo Upload Loading State for Form Disabling
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Form Mode: 'select' (pilih orang tua yang sudah ada) vs 'new' (buat orang tua baru)
  const [parentMode, setParentMode] = useState<'select' | 'new'>('select');

  // Form State for Adding Student
  const [sName, setSName] = useState('');
  const [sGrade, setSGrade] = useState('SD Kelas 1');
  const [sParentId, setSParentId] = useState('');
  const [sStatus, setSStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [sNotes, setSNotes] = useState('');
  const [sAvatarUrl, setSAvatarUrl] = useState('');

  // Dual-mode Parent creation
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  // Form State for Editing Student
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editStatus, setEditStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [editNotes, setEditNotes] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Role-Based Data Scoping Filter for Desktop
  const students = useMemo(() => {
    let list = allStudents;
    if (user?.role === 'parent' && user?.parent_id) {
      list = list.filter((st) => st.parent_id === user.parent_id);
    }
    if (statusFilter === 'Aktif') {
      return list.filter((st) => st.status === 'Aktif' && !st.is_deleted);
    }
    if (statusFilter === 'Nonaktif') {
      return list.filter((st) => st.status === 'Nonaktif' && !st.is_deleted);
    }
    if (statusFilter === 'Terhapus') {
      return list.filter((st) => st.is_deleted || Boolean(st.deleted_at));
    }
    return list.filter((st) => !st.is_deleted);
  }, [allStudents, user, statusFilter]);

  // Combined Infinite Scroll Items for Mobile View
  const mobileStudents = useMemo(() => {
    if (!infiniteData?.pages) return students;
    const allInfinite = infiniteData.pages.flatMap((page) => page.items);

    let filtered = allInfinite;
    if (user?.role === 'parent' && user?.parent_id) {
      filtered = allInfinite.filter((st) => st.parent_id === user.parent_id);
    }

    if (!globalFilter) return filtered;
    const lower = globalFilter.toLowerCase();
    return filtered.filter(
      (st) =>
        st.name.toLowerCase().includes(lower) ||
        st.grade.toLowerCase().includes(lower) ||
        st.parent_name.toLowerCase().includes(lower)
    );
  }, [infiniteData, students, user, globalFilter]);

  const handleSiswaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploadingPhoto) return;

    if (parentMode === 'select') {
      await createSiswaMutation.mutateAsync({
        name: sName,
        grade: sGrade,
        status: sStatus,
        parent_id: sParentId || undefined,
        notes: sNotes || undefined,
        avatar_url: sAvatarUrl || undefined
      });
    } else {
      await createSiswaMutation.mutateAsync({
        name: sName,
        grade: sGrade,
        status: sStatus,
        new_parent_name: newParentName,
        new_parent_phone: newParentPhone,
        notes: sNotes || undefined,
        avatar_url: sAvatarUrl || undefined
      });
    }

    setSName('');
    setSGrade('SD Kelas 1');
    setSParentId('');
    setSStatus('Aktif');
    setSNotes('');
    setSAvatarUrl('');
    setNewParentName('');
    setNewParentPhone('');
    setIsFormOpen(false);
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTargetStudent) return;
    const id = deleteTargetStudent.id;
    setDeleteTargetStudent(null);
    await deleteSiswaMutation.mutateAsync(id);
  };

  const handleEditClick = (std: StudentItem) => {
    setEditingStudent(std);
    setEditName(std.name);
    setEditGrade(std.grade);
    setEditParentId(std.parent_id || '');
    setEditStatus(std.status || 'Aktif');
    setEditNotes(std.notes || '');
    setEditAvatarUrl(std.avatar_url || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || isUploadingPhoto) return;

    await updateSiswaMutation.mutateAsync({
      id: editingStudent.id,
      name: editName,
      grade: editGrade,
      status: editStatus,
      parent_id: editParentId || undefined,
      notes: editNotes,
      avatar_url: editAvatarUrl
    });

    setEditingStudent(null);
  };

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [diagnosaTargetStudent, setDiagnosaTargetStudent] = useState<StudentItem | null>(null);

  const bulkDeleteSiswaMutation = useBulkDeleteSiswaMutation();

  const toggleSelectAll = (allList: StudentItem[]) => {
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

  const columns = useMemo<ColumnDef<StudentItem>[]>(() => {
    const cols: ColumnDef<StudentItem>[] = [];

    if (isBulkMode) {
      cols.push({
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={students.length > 0 && selectedIds.length === students.length}
            onChange={() => toggleSelectAll(students)}
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
            <span>Siswa Bimbingan</span>
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
              <div className="text-[11px] text-slate-400 font-mono truncate">ID: {info.row.original.id}</div>
            </div>
          </div>
        )
      },
      {
        accessorKey: 'grade',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs hover:text-emerald-700 cursor-pointer"
          >
            <span>Tingkat / Jenjang</span>
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
          <Badge variant="amber" size="md">
            {info.getValue() as string}
          </Badge>
        )
      },
      {
        accessorKey: 'parent_name',
        header: 'Nama Orang Tua & Kontak WA',
        cell: (info) => (
          <div className="space-y-0.5 min-w-0 max-w-[200px]">
            <div className="font-semibold text-slate-900 flex items-center gap-1 text-xs min-w-0">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate" title={info.getValue() as string || 'Belum Ditautkan'}>
                {info.getValue() as string || 'Belum Ditautkan'}
              </span>
            </div>
            <a
              href={formatWaUrl(info.row.original.parent_phone)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] text-emerald-700 font-mono font-bold flex items-center gap-1 hover:text-emerald-900 transition"
            >
              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{info.row.original.parent_phone}</span>
            </a>
          </div>
        )
      },
      {
        accessorKey: 'status',
        header: 'Status Siswa',
        cell: (info) => {
          const st = (info.getValue() as string) || 'Aktif';
          const isDeleted = Boolean(info.row.original.is_deleted || info.row.original.deleted_at);

          if (isDeleted) {
            return (
              <div className="space-y-1">
                <Badge variant="rose" size="sm">
                  Terhapus
                </Badge>
                {info.row.original.deleted_at && (
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {new Date(info.row.original.deleted_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                )}
              </div>
            );
          }

          return (
            <div className="space-y-1">
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!can('update', 'siswa')) return;
                  const nextStatus = st === 'Aktif' ? 'Nonaktif' : 'Aktif';
                  await updateSiswaMutation.mutateAsync({
                    id: info.row.original.id,
                    status: nextStatus
                  });
                }}
                disabled={updateSiswaMutation.isPending || !can('update', 'siswa')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs group/btn ${st === 'Aktif'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                title={`Klik tombol ini untuk mengubah status menjadi ${st === 'Aktif' ? 'Nonaktif' : 'Aktif'}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${st === 'Aktif' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                />
                <span>{st}</span>
              </button>
              {st === 'Nonaktif' && (
                <span className="text-[10px] text-amber-700 font-medium block">
                  ⚠️ Jadwal disembunyikan
                </span>
              )}
            </div>
          );
        }
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Aksi & Detail</div>,
        cell: (info) => {
          const isDeleted = Boolean(info.row.original.is_deleted || info.row.original.deleted_at);

          return (
            <div className="flex items-center justify-end gap-1">
              {isDeleted ? (
                can('update', 'siswa') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await restoreSiswaMutation.mutateAsync(info.row.original.id);
                    }}
                    disabled={restoreSiswaMutation.isPending}
                    className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Pulihkan
                  </Button>
                )
              ) : (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDiagnosaTargetStudent(info.row.original);
                    }}
                    className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                    title="Lihat Diagnosa Awal Siswa"
                  >
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/data-siswa/${info.row.original.id}`);
                    }}
                    className="text-xs group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Detail <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>

                  {can('update', 'siswa') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(info.row.original);
                      }}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                      title="Edit Data Siswa"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {can('delete', 'siswa') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetStudent(info.row.original);
                      }}
                      disabled={deleteSiswaMutation.isPending}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Hapus / Nonaktifkan Data Siswa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          );
        }
      }
    );
    return cols;
  },
    [router, updateSiswaMutation, deleteSiswaMutation, restoreSiswaMutation, can, isBulkMode, selectedIds, students]
  );

  const table = useReactTable({
    data: students,
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
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {user?.role === 'parent' ? 'Data Putra / Putri Saya' : 'Data Siswa & Anak Bimbingan'}
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden md:block">
              {user?.role === 'parent'
                ? 'Daftar putra/putri Anda yang terdaftar bimbingan belajar.'
                : 'Daftar murid, jenjang kelas, dan tautan wali siswa.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-2 ml-auto w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              icon={Search}
              placeholder="Cari siswa, jenjang, wali..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>

          {can('create', 'siswa') && (
            <div className="flex items-center gap-2 w-full">
              <div className='flex w-full'>
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
                  className={`w-full shadow-xs text-xs font-bold h-9 px-3 rounded-xl shrink-0 ${isBulkMode
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  {isBulkMode ? 'Tutup Mode Massal' : 'Pilih Massal'}
                </Button>
              </div>
              <div className='flex w-full'>
                <Button variant="primary" size="sm" onClick={() => setIsFormOpen(!isFormOpen)} className="w-full shadow-xs text-xs font-bold h-9 px-4 rounded-xl shrink-0">
                  <Plus className="w-3.5 h-3.5 mr-1 text-amber-300" /> Tambah Siswa
                </Button>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['Semua', 'Aktif', 'Nonaktif', 'Terhapus'] as const).map((tab) => {
          const isActive = statusFilter === tab;
          const count =
            tab === 'Semua'
              ? allStudents.filter((s) => !s.is_deleted).length
              : tab === 'Aktif'
                ? allStudents.filter((s) => s.status === 'Aktif' && !s.is_deleted).length
                : tab === 'Nonaktif'
                  ? allStudents.filter((s) => s.status === 'Nonaktif' && !s.is_deleted).length
                  : allStudents.filter((s) => s.is_deleted || Boolean(s.deleted_at)).length;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${isActive
                ? tab === 'Terhapus'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
                }`}
            >
              {tab === 'Terhapus' && <Archive className="w-3.5 h-3.5" />}
              <span>{tab === 'Terhapus' ? 'Sampah / Terhapus' : tab}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
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
                {selectedIds.length} data siswa terpilih
              </div>
              <div className="text-[11px] text-rose-600 font-medium">
                Klik hapus untuk menghapus data siswa terpilih secara bersamaan.
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
            {can('delete', 'siswa') && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="font-bold text-xs gap-1.5 shadow-md shadow-rose-200"
              >
                <Trash2 className="w-4 h-4" />
                Hapus {selectedIds.length} Siswa Terpilih
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 1. REUSABLE MODAL: KONFIRMASI NONAKTIFKAN / HAPUS SISWA */}
      <Modal
        isOpen={!!deleteTargetStudent}
        onClose={() => setDeleteTargetStudent(null)}
        title="Konfirmasi Nonaktifkan / Hapus Siswa"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        {deleteTargetStudent && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menonaktifkan data siswa <strong>{deleteTargetStudent.name}</strong> ({deleteTargetStudent.grade})?
            </p>

            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
              💡 <strong>Soft Delete:</strong> Data historis (jadwal belajar, hasil belajar, dan absensi) siswa ini akan tetap aman tersimpan di database dan tidak akan hilang.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetStudent(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteStudent} className="h-9 px-4 text-xs font-bold rounded-xl shadow-md">
                Ya, Nonaktifkan Siswa
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 2. REUSABLE MODAL: TAMBAH SISWA BIMBINGAN BARU */}
      <Modal
        isOpen={isFormOpen && can('create', 'siswa')}
        onClose={() => setIsFormOpen(false)}
        title="Tambah Siswa Bimbingan Baru"
        icon={UserPlus}
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <ImageUpload currentImageUrl={sAvatarUrl} onImageUploaded={setSAvatarUrl} onUploadingChange={setIsUploadingPhoto} />

            <form onSubmit={handleSiswaSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div className="sm:col-span-2">
                <Label required>Nama Lengkap Siswa:</Label>
                <Input required value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Ananda Bintang Pratama" disabled={isUploadingPhoto} />
              </div>
              <div>
                <Label required>Tingkat / Jenjang Kelas:</Label>
                <Input required value={sGrade} onChange={(e) => setSGrade(e.target.value)} placeholder="SD Kelas 3" disabled={isUploadingPhoto} />
              </div>
              <div>
                <Label required>Status Siswa:</Label>
                <Select
                  options={[
                    { label: 'Aktif', value: 'Aktif' },
                    { label: 'Nonaktif', value: 'Nonaktif' }
                  ]}
                  value={sStatus}
                  onChange={(val) => setSStatus(val as 'Aktif' | 'Nonaktif')}
                  isSearchable={false}
                  isClearable={false}
                  disabled={isUploadingPhoto}
                />
              </div>

              {/* Dual-Mode Selector for Parent */}
              <div className="sm:col-span-2 space-y-2 p-3.5 rounded-2xl bg-white border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label required>Tautan Orang Tua / Wali Siswa:</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => setParentMode('select')}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${parentMode === 'select'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      Pilih Yang Ada
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => setParentMode('new')}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition ${parentMode === 'new'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      + Buat Wali Baru
                    </button>
                  </div>
                </div>

                {parentMode === 'select' ? (
                  <Select
                    options={parentOptions}
                    value={sParentId}
                    onChange={(val) => setSParentId(val)}
                    placeholder="-- Cari Orang Tua / Wali Terdaftar --"
                    isSearchable
                    isClearable
                    disabled={isUploadingPhoto}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label required>Nama Orang Tua Baru:</Label>
                      <Input required value={newParentName} onChange={(e) => setNewParentName(e.target.value)} placeholder="Ibu Ratna" disabled={isUploadingPhoto} />
                    </div>
                    <div>
                      <Label required>No. WA Orang Tua Baru:</Label>
                      <Input required value={newParentPhone} onChange={(e) => setNewParentPhone(e.target.value)} placeholder="081987654321" disabled={isUploadingPhoto} />
                    </div>
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <Label>Catatan Khusus Belajar / Kebutuhan Siswa:</Label>
                <RichTextEditor
                  value={sNotes}
                  onChange={setSNotes}
                  placeholder="Contoh: Perlu bimbingan ekstra matematika dasar, fokus latihan membaca..."
                  minHeight="90px"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} disabled={isUploadingPhoto} className="h-9 px-4 text-xs font-bold rounded-xl">
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={createSiswaMutation.isPending || isUploadingPhoto} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                  {isUploadingPhoto ? 'Mengunggah Foto...' : createSiswaMutation.isPending ? 'Menyimpan...' : 'Simpan Siswa Baru'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* 3. REUSABLE MODAL: EDIT DATA SISWA */}
      <Modal
        isOpen={!!editingStudent}
        onClose={() => !isUploadingPhoto && setEditingStudent(null)}
        title="Edit Data Siswa Bimbingan"
        icon={Edit3}
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <ImageUpload currentImageUrl={editAvatarUrl} onImageUploaded={setEditAvatarUrl} onUploadingChange={setIsUploadingPhoto} />

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label required>Nama Lengkap Siswa:</Label>
              <Input required value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isUploadingPhoto} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label required>Tingkat Kelas:</Label>
                <Input required value={editGrade} onChange={(e) => setEditGrade(e.target.value)} disabled={isUploadingPhoto} />
              </div>
              <div>
                <Label required>Status Siswa:</Label>
                <Select
                  options={[
                    { label: 'Aktif', value: 'Aktif' },
                    { label: 'Nonaktif', value: 'Nonaktif' }
                  ]}
                  value={editStatus}
                  onChange={(val) => setEditStatus(val as 'Aktif' | 'Nonaktif')}
                  isSearchable={false}
                  isClearable={false}
                  disabled={isUploadingPhoto}
                />
              </div>
            </div>
            <div>
              <Label>Tautan Orang Tua / Wali:</Label>
              <Select
                options={parentOptions}
                value={editParentId}
                onChange={(val) => setEditParentId(val)}
                placeholder="-- Cari Orang Tua / Wali Terdaftar --"
                isSearchable
                isClearable
                disabled={isUploadingPhoto}
              />
            </div>
            <div>
              <Label>Catatan Khusus Belajar / Kebutuhan Siswa:</Label>
              <RichTextEditor
                value={editNotes}
                onChange={setEditNotes}
                placeholder="Contoh: Perlu bimbingan ekstra matematika dasar..."
                minHeight="90px"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setEditingStudent(null)} disabled={isUploadingPhoto} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={updateSiswaMutation.isPending || isUploadingPhoto} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                {isUploadingPhoto ? 'Mengunggah Foto...' : updateSiswaMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* 4. REUSABLE MODAL: DIAGNOSA AWAL & CATATAN KEBUTUHAN SISWA */}
      <Modal
        isOpen={Boolean(diagnosaTargetStudent)}
        onClose={() => setDiagnosaTargetStudent(null)}
        title="Diagnosa Awal & Catatan Kebutuhan Siswa"
        icon={ClipboardList}
        maxWidth="md"
      >
        {diagnosaTargetStudent && (
          <div className="space-y-4">
            <div className="bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/90 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-amber-950 font-bold text-xs sm:text-sm truncate" title={diagnosaTargetStudent.name}>
                  {diagnosaTargetStudent.name}
                </p>
                <p className="text-amber-800 text-[11px] font-medium truncate" title={`Wali: ${diagnosaTargetStudent.parent_name || 'Belum Ditautkan'}`}>
                  {diagnosaTargetStudent.grade} • Wali: {diagnosaTargetStudent.parent_name || 'Belum Ditautkan'}
                </p>
              </div>
              {diagnosaTargetStudent.parent_phone && diagnosaTargetStudent.parent_phone !== '-' && (
                <a
                  href={formatWaUrl(diagnosaTargetStudent.parent_phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-800 font-mono text-[11px] font-bold flex items-center gap-1 hover:underline shrink-0"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>{diagnosaTargetStudent.parent_phone}</span>
                </a>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-amber-100/40 border border-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-amber-950 border-b border-amber-200/80 pb-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                <span>Hasil Diagnosa / Catatan Kebutuhan Belajar:</span>
              </div>
              {diagnosaTargetStudent.notes ? (
                <div
                  className="rich-text-content text-slate-800 font-normal text-xs sm:text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatRichContent(diagnosaTargetStudent.notes) }}
                />
              ) : (
                <p className="text-xs text-slate-400 italic py-3 text-center">
                  Belum ada catatan hasil diagnosa awal khusus untuk siswa ini.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              {can('update', 'siswa') && (
                <button
                  onClick={() => {
                    const target = diagnosaTargetStudent;
                    setDiagnosaTargetStudent(null);
                    handleEditClick(target);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Edit Diagnosa
                </button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setDiagnosaTargetStudent(null)}
                className="h-9 text-xs font-bold px-4 rounded-xl ml-auto"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>



      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : (
        <>
          {/* VERSION 1: WEB / DESKTOP VIEW (TABLE FORMAT WITH PAGINATION) - Visible on md screens (>=768px) */}
          <Card className="hidden md:block p-0 overflow-hidden bg-white shadow-sm border border-slate-200 rounded-3xl">
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
                            router.push(`/data-siswa/${row.original.id}`);
                          }
                        }}
                        className={`hover:bg-emerald-50/40 cursor-pointer transition group ${selectedIds.includes(row.original.id) ? 'bg-emerald-50/60' : ''
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
                        Tidak ada data siswa yang cocok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination table={table} />
          </Card>

          {/* VERSION 2: MOBILE VIEW (CARD FORMAT WITH TANSTACK QUERY INFINITE SCROLL) - Visible on small screens (<768px) */}
          <div className="block md:hidden space-y-3">
            {mobileStudents.length > 0 ? (
              mobileStudents.map((std) => (
                <Card
                  key={std.id}
                  onClick={() => {
                    if (isBulkMode) {
                      toggleSelectOne(std.id);
                    } else {
                      router.push(`/data-siswa/${std.id}`);
                    }
                  }}
                  className={`p-4 space-y-3 bg-white border transition cursor-pointer rounded-2xl min-w-0 overflow-hidden ${selectedIds.includes(std.id)
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/40'
                    : 'border-slate-200 hover:border-emerald-300'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {isBulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(std.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectOne(std.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                      )}
                      <Avatar name={std.name} src={std.avatar_url} size="lg" className="ring-2 ring-emerald-400/40 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-900 text-sm truncate" title={std.name}>{std.name}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <Badge variant="amber" size="sm">{std.grade}</Badge>
                          {std.is_deleted ? (
                            <Badge variant="rose" size="sm">Terhapus</Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!can('update', 'siswa')) return;
                                const nextStatus = std.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
                                await updateSiswaMutation.mutateAsync({
                                  id: std.id,
                                  status: nextStatus
                                });
                              }}
                              disabled={updateSiswaMutation.isPending || !can('update', 'siswa')}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${std.status === 'Aktif'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              title="Klik untuk ubah status"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${std.status === 'Aktif' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                  }`}
                              />
                              <span>{std.status || 'Aktif'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Orang Tua / Wali:</span>
                      <a
                        href={formatWaUrl(std.parent_phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-700 font-mono font-bold flex items-center gap-1 hover:underline text-[11px] shrink-0"
                      >
                        <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>{std.parent_phone}</span>
                      </a>
                    </div>
                    <p className="font-semibold text-slate-800 truncate block w-full max-w-full" title={std.parent_name || 'Belum Ditautkan'}>
                      {std.parent_name || 'Belum Ditautkan'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDiagnosaTargetStudent(std);
                        }}
                        className="text-xs justify-center py-1 font-bold border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 transition cursor-pointer"
                      >
                        <ClipboardList className="w-3.5 h-3.5 mr-1 text-amber-600" /> Diagnosa
                      </Button>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/data-siswa/${std.id}`);
                        }}
                        className="text-xs justify-center py-1 font-bold"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Detail Hasil
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {std.is_deleted ? (
                        can('update', 'siswa') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              await restoreSiswaMutation.mutateAsync(std.id);
                            }}
                            disabled={restoreSiswaMutation.isPending}
                            className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300 font-bold"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Pulihkan
                          </Button>
                        )
                      ) : (
                        <>
                          {can('update', 'siswa') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(std);
                              }}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}

                          {can('delete', 'siswa') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTargetStudent(std);
                              }}
                              disabled={deleteSiswaMutation.isPending}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center text-slate-400">
                Tidak ada data siswa yang cocok.
              </Card>
            )}

            {/* TanStack Query Infinite Scroll Action Trigger */}
            {hasNextPage && (
              <div className="pt-2 text-center">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full text-xs font-bold py-2.5 bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50 shadow-xs justify-center"
                >
                  <ArrowDown className="w-4 h-4 mr-1 text-emerald-600 animate-bounce" />
                  {isFetchingNextPage ? 'Memuat Data Berikutnya...' : '👇 Muat Lebih Banyak Siswa'}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* BULK DELETE MODAL */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        title="Konfirmasi Nonaktifkan Banyak Siswa"
        icon={AlertTriangle}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin menonaktifkan <strong className="text-slate-900">{selectedIds.length} data siswa</strong> terpilih?
          </p>

          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
            💡 <strong>Bukan Hapus Permanen (Soft Delete):</strong> Data siswa akan dinonaktifkan dan jadwalnya otomatis disembunyikan. Seluruh riwayat hasil belajar dan absensi terdahulu tetap aman tersimpan di database dan dapat dipulihkan kapan saja di tab <em>Sampah / Terhapus</em>.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsBulkDeleteModalOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={bulkDeleteSiswaMutation.isPending}
              onClick={async () => {
                await bulkDeleteSiswaMutation.mutateAsync(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
              }}
              className="h-9 px-4 text-xs font-bold rounded-xl shadow-md"
            >
              {bulkDeleteSiswaMutation.isPending ? 'Menonaktifkan...' : `Ya, Nonaktifkan ${selectedIds.length} Siswa`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
