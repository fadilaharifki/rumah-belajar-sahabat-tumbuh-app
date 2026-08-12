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
import { ShieldCheck, UserPlus, Search, Phone, Eye, Edit3, Trash2, ArrowUpDown, ArrowUp, ArrowDown, User, CheckSquare, AlertTriangle, ChevronRight, Filter, GraduationCap, Plus } from 'lucide-react';
import {
  useSiswaQuery,
  useInfiniteSiswaQuery,
  useCreateSiswaMutation,
  useUpdateSiswaMutation,
  useDeleteSiswaMutation,
  useBulkDeleteSiswaMutation,
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
import { formatWaUrl } from '@/utils/formatters';

export default function DataSiswaPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { can } = useAbility();

  const [sorting, setSorting] = useState<SortingState>([]);
  const activeSortBy = sorting[0]?.id;
  const activeSortOrder = sorting[0] ? (sorting[0].desc ? 'desc' : 'asc') : undefined;

  // TanStack Query Hooks for Siswa & Wali with BE sorting
  const { data: allStudents = [], isLoading } = useSiswaQuery(activeSortBy, activeSortOrder);
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
  const [sNotes, setSNotes] = useState('');
  const [sAvatarUrl, setSAvatarUrl] = useState('');

  // Dual-mode Parent creation
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  // Form State for Editing Student
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editParentId, setEditParentId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');

  // Role-Based Data Scoping Filter for Desktop
  const students = useMemo(() => {
    if (user?.role === 'parent' && user?.parent_id) {
      return allStudents.filter((st) => st.parent_id === user.parent_id);
    }
    return allStudents;
  }, [allStudents, user]);

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
        parent_id: sParentId || undefined,
        notes: sNotes || undefined,
        avatar_url: sAvatarUrl || undefined
      });
    } else {
      await createSiswaMutation.mutateAsync({
        name: sName,
        grade: sGrade,
        new_parent_name: newParentName,
        new_parent_phone: newParentPhone,
        notes: sNotes || undefined,
        avatar_url: sAvatarUrl || undefined
      });
    }

    setSName('');
    setSGrade('SD Kelas 1');
    setSParentId('');
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
      parent_id: editParentId || undefined,
      notes: editNotes,
      avatar_url: editAvatarUrl
    });

    setEditingStudent(null);
  };

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

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
          <div className="flex items-center gap-3">
            <Avatar name={info.getValue() as string} src={info.row.original.avatar_url} size="md" />
            <div>
              <div className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition">
                {info.getValue() as string}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">ID: {info.row.original.id}</div>
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
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-900 flex items-center gap-1 text-xs">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{info.getValue() as string || 'Belum Ditautkan'}</span>
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
        id: 'actions',
        header: () => <div className="text-right">Aksi & Detail</div>,
        cell: (info) => (
          <div className="flex items-center justify-end gap-1">
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
                title="Hapus Data Siswa"
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
    [router, deleteSiswaMutation, can, isBulkMode, selectedIds, students]
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

      {/* 1. REUSABLE MODAL: KONFIRMASI HAPUS SISWA */}
      <Modal
        isOpen={!!deleteTargetStudent}
        onClose={() => setDeleteTargetStudent(null)}
        title="Konfirmasi Hapus Siswa"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        {deleteTargetStudent && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data siswa <strong>{deleteTargetStudent.name}</strong> ({deleteTargetStudent.grade})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetStudent(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteStudent} className="h-9 px-4 text-xs font-bold rounded-xl shadow-md">
                Ya, Hapus Data Siswa
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
              <div>
                <Label required>Nama Lengkap Siswa:</Label>
                <Input required value={sName} onChange={(e) => setSName(e.target.value)} placeholder="Ananda Bintang Pratama" disabled={isUploadingPhoto} />
              </div>
              <div>
                <Label required>Tingkat / Jenjang Kelas:</Label>
                <Input required value={sGrade} onChange={(e) => setSGrade(e.target.value)} placeholder="SD Kelas 3" disabled={isUploadingPhoto} />
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
                <Input value={sNotes} onChange={(e) => setSNotes(e.target.value)} placeholder="Perlu bimbingan ekstra matematika dasar" disabled={isUploadingPhoto} />
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
            <div>
              <Label required>Tingkat Kelas:</Label>
              <Input required value={editGrade} onChange={(e) => setEditGrade(e.target.value)} disabled={isUploadingPhoto} />
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
              <Label>Catatan Belajar:</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} disabled={isUploadingPhoto} />
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
                  className={`p-4 space-y-3 bg-white border transition cursor-pointer rounded-2xl ${selectedIds.includes(std.id)
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-400/40'
                    : 'border-slate-200 hover:border-emerald-300'
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {isBulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(std.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleSelectOne(std.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      )}
                      <Avatar name={std.name} src={std.avatar_url} size="lg" className="ring-2 ring-emerald-400/40 shrink-0" />
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">{std.name}</h3>
                        <Badge variant="amber" size="sm" className="mt-0.5">{std.grade}</Badge>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Orang Tua / Wali:</span>
                      <a
                        href={formatWaUrl(std.parent_phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-700 font-mono font-bold flex items-center gap-1 hover:underline text-[11px]"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{std.parent_phone}</span>
                      </a>
                    </div>
                    <p className="font-semibold text-slate-800">{std.parent_name || 'Belum Ditautkan'}</p>
                  </div>

                  {std.notes && (
                    <p className="text-[11px] text-amber-900 italic font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                      "{std.notes}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/data-siswa/${std.id}`);
                      }}
                      className="text-xs justify-center py-1 font-bold"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Detail Hasil Belajar
                    </Button>

                    <div className="flex items-center gap-1">
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
        title="Konfirmasi Hapus Banyak Siswa"
        icon={AlertTriangle}
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Apakah Anda yakin ingin menghapus <strong className="text-slate-900">{selectedIds.length} data siswa</strong> terpilih?
            Tindakan ini akan menghapus data terpilih secara permanen.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsBulkDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              disabled={bulkDeleteSiswaMutation.isPending}
              onClick={async () => {
                await bulkDeleteSiswaMutation.mutateAsync(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
              }}
            >
              {bulkDeleteSiswaMutation.isPending ? 'Menghapus...' : `Ya, Hapus ${selectedIds.length} Siswa`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
