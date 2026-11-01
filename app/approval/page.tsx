'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Check,
  X,
  AlertTriangle,
  UserCheck,
  GraduationCap,
  Calendar,
  FileText,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Edit3,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAbility } from '@/hooks/useAbility';
import {
  useApprovalListQuery,
  useExecuteApprovalMutation,
  ApprovalItem
} from '@/hooks/queries/useApprovalQueries';
import { useGuruQuery } from '@/hooks/queries/useGuruQueries';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Avatar } from '@/components/atoms/Avatar';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Modal } from '@/components/atoms/Modal';
import { DatePicker } from '@/components/atoms/DatePicker';
import { SkeletonTable } from '@/components/atoms/Skeleton';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

function formatRichContent(text?: string): string {
  if (!text) return '-';
  const hasHtml = /<[a-z][\s\S]*>/i.test(text);
  if (hasHtml) return text;
  return text.replace(/\n/g, '<br />');
}

export default function ApprovalEvaluasiPage() {
  const { user } = useAuthStore();
  const { can } = useAbility();

  const isOwner = user?.role === 'admin';
  const hasApprovePrivilege = can('approve', 'presensi');

  // Filter State
  const [activeTab, setActiveTab] = useState<'pending' | 'revision' | 'valid' | 'invalid' | 'all'>('pending');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date());
  });
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // TanStack Query for approval items scoped to supervisor
  const { data: approvalResponse, isLoading, refetch } = useApprovalListQuery({
    status: activeTab,
    month: selectedMonth,
    teacherId: selectedTeacherId
  });

  const { data: teachers = [] } = useGuruQuery();
  const executeApprovalMutation = useExecuteApprovalMutation();

  // Modal States
  const [detailModalItem, setDetailModalItem] = useState<ApprovalItem | null>(null);
  const [approveConfirmItem, setApproveConfirmItem] = useState<ApprovalItem | null>(null);
  const [revisionModalItem, setRevisionModalItem] = useState<ApprovalItem | null>(null);
  const [rejectConfirmItem, setRejectConfirmItem] = useState<ApprovalItem | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  const rawList = approvalResponse?.data || [];
  const counts = (approvalResponse?.counts as any) || { pending: 0, revision: 0, valid: 0, invalid: 0, total: 0 };

  // Filter by local search query (nama guru / nama siswa)
  const displayList = useMemo(() => {
    if (!searchQuery.trim()) return rawList;
    const q = searchQuery.toLowerCase().trim();
    return rawList.filter(
      (item) =>
        item.teacher.name.toLowerCase().includes(q) ||
        item.student.name.toLowerCase().includes(q) ||
        (item.session_log?.activities || '').toLowerCase().includes(q)
    );
  }, [rawList, searchQuery]);

  // Handlers for approval actions
  const handleConfirmApprove = async () => {
    if (!approveConfirmItem) return;
    await executeApprovalMutation.mutateAsync({
      attendanceId: approveConfirmItem.id,
      action: 'Valid',
      notes: 'Disetujui oleh atasan (Valid)'
    });
    setApproveConfirmItem(null);
  };

  const handleConfirmRevision = async () => {
    if (!revisionModalItem) return;
    if (!revisionNotes.trim()) return;

    await executeApprovalMutation.mutateAsync({
      attendanceId: revisionModalItem.id,
      action: 'NeedRevision',
      notes: revisionNotes.trim()
    });
    setRevisionModalItem(null);
    setRevisionNotes('');
  };

  const handleConfirmReject = async () => {
    if (!rejectConfirmItem) return;

    await executeApprovalMutation.mutateAsync({
      attendanceId: rejectConfirmItem.id,
      action: 'Invalid',
      notes: rejectNotes.trim() || 'Laporan ditolak permanen (Tidak Valid)'
    });
    setRejectConfirmItem(null);
    setRejectNotes('');
  };

  // If user does not have approval privileges
  if (!hasApprovePrivilege) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto my-12 space-y-4 bg-white border border-rose-200">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Akses Ditolak</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Halaman ini khusus diperuntukkan bagi <strong>Pemilik</strong> atau <strong>Guru Senior / Koordinator</strong> yang memiliki hak akses verifikasi laporan evaluasi.
        </p>
      </Card>
    );
  }

  const monthLabel = format(new Date(`${selectedMonth}-01`), 'MMMM yyyy');

  return (
    <div className="space-y-3.5">
      {/* 1. Header & Hierarchy Scope Indicator */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2.5 sm:gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <ClipboardCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 leading-snug">
                  Approval & Verifikasi Laporan Evaluasi
                </h1>
                <Badge variant={isOwner ? 'amber' : 'emerald'} size="sm" className="font-bold text-[10px] shrink-0">
                  {isOwner ? 'Pemilik Utama' : 'Guru Senior / Supervisor'}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                {isOwner
                  ? 'Meninjau seluruh laporan evaluasi hasil belajar siswa dari semua pengajar.'
                  : 'Meninjau dan memvalidasi laporan evaluasi khusus dari guru-guru binaan Anda.'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs font-bold gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl text-slate-600 shrink-0 mt-0.5"
            title="Refresh data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden min-[400px]:inline">Refresh</span>
          </Button>
        </div>

        {/* 2. KPI / Metrics Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5 pt-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-50/90 border-amber-300 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800">Menunggu ACC</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-extrabold text-amber-900 mt-1 font-mono">
              {counts.pending}
            </div>
            <span className="text-[10px] text-amber-700">Butuh tindakan review</span>
          </button>

          <button
            onClick={() => setActiveTab('revision')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'revision'
                ? 'bg-orange-50/90 border-orange-300 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-orange-800">Perlu Revisi</span>
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-xl font-extrabold text-orange-900 mt-1 font-mono">
              {counts.revision || 0}
            </div>
            <span className="text-[10px] text-orange-700">Diberi catatan revisi</span>
          </button>

          <button
            onClick={() => setActiveTab('valid')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'valid'
                ? 'bg-emerald-50/90 border-emerald-300 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800">Disetujui (Valid)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-extrabold text-emerald-900 mt-1 font-mono">
              {counts.valid}
            </div>
            <span className="text-[10px] text-emerald-700">Masuk honor penggajian</span>
          </button>

          <button
            onClick={() => setActiveTab('invalid')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer ${
              activeTab === 'invalid'
                ? 'bg-rose-50/90 border-rose-300 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800">Ditolak (Invalid)</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-extrabold text-rose-900 mt-1 font-mono">
              {counts.invalid}
            </div>
            <span className="text-[10px] text-rose-700">Tidak sah / hangus</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`p-2.5 sm:p-3 rounded-xl border text-left transition cursor-pointer col-span-2 sm:col-span-1 ${
              activeTab === 'all'
                ? 'bg-slate-200/80 border-slate-400 shadow-xs'
                : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">Semua Laporan</span>
              <FileText className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex items-baseline justify-between sm:block mt-1">
              <div className="text-xl font-extrabold text-slate-900 font-mono">
                {counts.total}
              </div>
              <span className="text-[10px] text-slate-500">Total di periode ini</span>
            </div>
          </button>
        </div>

        {/* 3. Toolbar Filters (Search, Month, Teacher) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
            <div className="w-full sm:flex-1">
              <Input
                icon={Search}
                placeholder="Cari guru, siswa, atau materi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={`grid ${isOwner ? 'grid-cols-2' : 'grid-cols-1'} sm:flex sm:items-center gap-2 w-full sm:w-auto`}>
              <div className="w-full sm:w-44">
                <DatePicker
                  mode="month"
                  value={selectedMonth}
                  onChange={(d) => setSelectedMonth(format(d, 'yyyy-MM'))}
                  placeholder="Pilih Bulan"
                />
              </div>

              {isOwner && (
                <div className="w-full sm:w-56">
                  <Select
                    options={[
                      { label: 'Semua Guru Pengajar', value: 'all' },
                      ...teachers.map((t) => ({ label: t.name, value: t.id }))
                    ]}
                    value={selectedTeacherId}
                    onChange={(val) => setSelectedTeacherId(val || 'all')}
                    isSearchable
                    isClearable={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Table Data & Cards */}
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : displayList.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 space-y-2 bg-white border border-slate-200">
          <ClipboardCheck className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="font-bold text-sm text-slate-700">
            {activeTab === 'pending'
              ? `Tidak ada laporan yang menunggu approval di periode ${monthLabel}. 🎉`
              : activeTab === 'valid'
              ? `Belum ada laporan disetujui di periode ${monthLabel}.`
              : activeTab === 'invalid'
              ? `Tidak ada laporan yang ditolak di periode ${monthLabel}.`
              : `Belum ada data evaluasi di periode ${monthLabel}.`}
          </h3>
          <p className="text-xs text-slate-400">
            {approvalResponse?.message || 'Semua laporan evaluasi telah diproses dengan tuntas.'}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile Card List (md:hidden) */}
          <div className="md:hidden space-y-3">
            {displayList.map((item) => {
              const isPending = item.status === 'PendingApproval';
              const isRevision = item.status === 'NeedRevision';
              const isValid = item.status === 'Valid' || item.status === 'ManualVerified';
              const isInvalid = item.status === 'Invalid';

              const statusConfig = isPending
                ? {
                    border: 'border-l-amber-500',
                    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
                    icon: Clock,
                    label: 'Menunggu ACC',
                    pulse: true
                  }
                : isRevision
                ? {
                    border: 'border-l-orange-500',
                    badgeBg: 'bg-orange-100 text-orange-900 border-orange-300',
                    icon: AlertCircle,
                    label: 'Perlu Revisi',
                    pulse: false
                  }
                : isValid
                ? {
                    border: 'border-l-emerald-500',
                    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                    icon: CheckCircle2,
                    label: 'Disetujui (Valid)',
                    pulse: false
                  }
                : {
                    border: 'border-l-rose-500',
                    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
                    icon: XCircle,
                    label: 'Ditolak (Invalid)',
                    pulse: false
                  };

              const StatusIcon = statusConfig.icon;

              let formattedDate = item.date;
              try {
                formattedDate = format(new Date(item.date), 'EEEE, dd MMM yyyy', { locale: localeID });
              } catch {
                formattedDate = item.date;
              }

              const timeRange = item.check_in
                ? `${item.check_in.slice(0, 5)}${item.check_out ? ` - ${item.check_out.slice(0, 5)}` : ''}`
                : null;

              return (
                <div
                  key={`m-${item.id}`}
                  className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-200 overflow-hidden border-l-4 ${statusConfig.border}`}
                >
                  <div className="p-3.5 space-y-3">
                    {/* Header: Date, Time & Status Badge (Top-Right) */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{formattedDate}</span>
                        {timeRange && (
                          <span className="text-[11px] text-slate-400 font-mono font-medium shrink-0">
                            • {timeRange}
                          </span>
                        )}
                      </div>

                      {/* Status Pill directly at top-right */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${statusConfig.badgeBg}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                        <span>{statusConfig.label}</span>
                      </span>
                    </div>

                    {/* Notes Callout if Revision or Rejection (Directly under header) */}
                    {(isRevision || isInvalid) && item.approval_notes && (
                      <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                        isRevision ? 'bg-orange-50/90 text-orange-950 border-orange-200' : 'bg-rose-50/90 text-rose-950 border-rose-200'
                      }`}>
                        <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isRevision ? 'text-orange-600' : 'text-rose-600'}`} />
                        <div className="min-w-0 flex-1 text-[11px] leading-relaxed">
                          <strong className="block text-[10px] font-extrabold uppercase tracking-wider mb-0.5">
                            {isRevision ? 'Catatan Instruksi Revisi:' : 'Alasan Penolakan:'}
                          </strong>
                          <p className="line-clamp-2 break-words" title={item.approval_notes}>
                            {item.approval_notes}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* People: Guru & Siswa */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Guru */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
                        <Avatar src={item.teacher.photo_url} name={item.teacher.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Guru:</span>
                          <div className="font-bold text-slate-900 truncate leading-tight">{item.teacher.name}</div>
                          {item.teacher.session_rate > 0 && (
                            <span className="text-[10px] font-mono font-semibold text-emerald-700 block mt-0.5">
                              Rp {item.teacher.session_rate.toLocaleString('id-ID')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Siswa */}
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
                        <Avatar src={item.student.avatar_url} name={item.student.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Siswa:</span>
                          <div className="font-bold text-slate-900 truncate leading-tight">{item.student.name}</div>
                          <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                            Kelas: {item.student.grade || '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Session Badge & Actions */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        {item.session_log && (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200/80 shrink-0">
                            Pertemuan #{item.session_log.session_number}
                          </span>
                        )}
                        {item.session_log?.photo_url && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                            📷 Ada Foto
                          </span>
                        )}
                        {isValid && item.approver_name && (
                          <span className="text-[10px] text-slate-400 truncate">
                            Di-ACC: <strong className="text-slate-600">{item.approver_name}</strong>
                          </span>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setDetailModalItem(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                          title="Lihat Detail Jurnal"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" /> Detail
                        </button>

                        {item.status !== 'NeedRevision' && (
                          <button
                            onClick={() => {
                              setRevisionModalItem(item);
                              setRevisionNotes(item.approval_notes || '');
                            }}
                            disabled={executeApprovalMutation.isPending}
                            className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                            title="Minta Guru Merevisi Laporan"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Revisi
                          </button>
                        )}

                        {item.status !== 'Valid' && (
                          <button
                            onClick={() => setApproveConfirmItem(item)}
                            disabled={executeApprovalMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition"
                            title="Setujui Laporan Evaluasi (ACC)"
                          >
                            <Check className="w-3.5 h-3.5" /> ACC
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <Card className="hidden md:block p-0 overflow-hidden bg-white shadow-2xs border border-slate-200/90 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider select-none">
                    <th className="px-4 py-3.5 w-[200px]">Tanggal & Sesi</th>
                    <th className="px-4 py-3.5 min-w-[180px]">Guru Pengajar</th>
                    <th className="px-4 py-3.5 min-w-[180px]">Siswa Bimbingan</th>
                    <th className="px-4 py-3.5 w-[200px]">Status Approval</th>
                    <th className="px-4 py-3.5 w-[240px] text-right">Aksi Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayList.map((item) => {
                    const isPending = item.status === 'PendingApproval';
                    const isRevision = item.status === 'NeedRevision';
                    const isValid = item.status === 'Valid' || item.status === 'ManualVerified';
                    const isInvalid = item.status === 'Invalid';

                    let formattedDate = item.date;
                    try {
                      formattedDate = format(new Date(item.date), 'dd MMM yyyy', { locale: localeID });
                    } catch {
                      formattedDate = item.date;
                    }

                    const timeStr = item.check_in
                      ? `${item.check_in.slice(0, 5)}${item.check_out ? ` - ${item.check_out.slice(0, 5)}` : ''}`
                      : '-';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Tanggal & Sesi */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{formattedDate}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{timeStr}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {item.session_log && (
                              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-extrabold text-[10px] border border-indigo-200/80">
                                Pertemuan #{item.session_log.session_number}
                              </span>
                            )}
                            {item.session_log?.photo_url && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded-md font-bold">
                                📷 Ada Foto
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 2. Guru Pengajar */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={item.teacher.photo_url} name={item.teacher.name} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 leading-tight truncate">
                                {item.teacher.name}
                              </div>
                              <span className="text-[10px] font-mono font-semibold text-emerald-700 block mt-1">
                                Rp {item.teacher.session_rate.toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Siswa Bimbingan */}
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex items-center gap-2.5">
                            <Avatar src={item.student.avatar_url} name={item.student.name} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-900 leading-tight truncate">
                                {item.student.name}
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-1 truncate">
                                Kelas: {item.student.grade || '-'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Status Approval & Audit */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          {isPending && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                Menunggu Approval
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-1">
                                Atasan: {item.teacher.supervisor_name || 'Pemilik'}
                              </span>
                            </div>
                          )}

                          {isRevision && (
                            <div className="space-y-1 max-w-[190px]">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
                                <AlertCircle className="w-3.5 h-3.5 text-orange-600" />
                                Perlu Revisi
                              </span>
                              {item.approval_notes && (
                                <p
                                  className="text-[10px] text-orange-800 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200 truncate cursor-help block max-w-[190px]"
                                  title={`Catatan Revisi: ${item.approval_notes}`}
                                >
                                  <strong>Revisi:</strong> {item.approval_notes}
                                </p>
                              )}
                            </div>
                          )}

                          {isValid && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Disetujui (Valid)
                              </span>
                              {item.approver_name && (
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  Oleh: <strong>{item.approver_name}</strong>
                                </span>
                              )}
                            </div>
                          )}

                          {isInvalid && (
                            <div className="space-y-1 max-w-[190px]">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                Ditolak (Invalid)
                              </span>
                              {item.approval_notes && (
                                <p
                                  className="text-[10px] text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 truncate cursor-help block max-w-[190px]"
                                  title={`Alasan Penolakan: ${item.approval_notes}`}
                                >
                                  <strong>Alasan:</strong> {item.approval_notes}
                                </p>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Aksi Review */}
                        <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Detail Preview Button */}
                            <button
                              onClick={() => setDetailModalItem(item)}
                              className="px-2.5 py-1.5 text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-emerald-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Lihat Detail Jurnal Evaluasi"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" /> Detail
                            </button>

                            {/* Quick Revisi Button */}
                            {item.status !== 'NeedRevision' && (
                              <button
                                onClick={() => {
                                  setRevisionModalItem(item);
                                  setRevisionNotes(item.approval_notes || '');
                                }}
                                disabled={executeApprovalMutation.isPending}
                                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Minta Guru Merevisi Laporan"
                              >
                                <Edit3 className="w-3.5 h-3.5" /> Revisi
                              </button>
                            )}

                            {/* Quick Reject Button */}
                            {item.status !== 'Invalid' && (
                              <button
                                onClick={() => {
                                  setRejectConfirmItem(item);
                                  setRejectNotes(item.approval_notes || '');
                                }}
                                disabled={executeApprovalMutation.isPending}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                                title="Tolak Permanen (Tidak Valid)"
                              >
                                <X className="w-3.5 h-3.5" /> Tolak
                              </button>
                            )}

                            {/* Quick ACC Button */}
                            {item.status !== 'Valid' && (
                              <button
                                onClick={() => setApproveConfirmItem(item)}
                                disabled={executeApprovalMutation.isPending}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
                                title="Setujui Laporan Evaluasi (ACC)"
                              >
                                <Check className="w-3.5 h-3.5" /> ACC
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* 5. MODAL: KONFIRMASI APPROVAL (ACC) */}
      <Modal
        isOpen={!!approveConfirmItem}
        onClose={() => setApproveConfirmItem(null)}
        title="Konfirmasi Persetujuan Laporan"
        icon={CheckCircle2}
        maxWidth="sm"
      >
        {approveConfirmItem && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menyetujui laporan evaluasi dari guru <strong>{approveConfirmItem.teacher.name}</strong> untuk siswa <strong>{approveConfirmItem.student.name}</strong> pada tanggal <strong>{approveConfirmItem.date}</strong>?
            </p>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <div className="font-bold">Dampak Persetujuan:</div>
              <div>• Status sesi berubah menjadi <strong className="text-emerald-800">Valid</strong>.</div>
              <div>• Honor sesi sebesar <strong className="font-mono">Rp {approveConfirmItem.teacher.session_rate.toLocaleString('id-ID')}</strong> otomatis masuk ke rekap penggajian guru.</div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setApproveConfirmItem(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmApprove}
                disabled={executeApprovalMutation.isPending}
                className="h-9 px-5 text-xs font-bold rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {executeApprovalMutation.isPending ? 'Menyetujui...' : 'Ya, Setujui (ACC)'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 6. MODAL: MINTA REVISI LAPORAN */}
      <Modal
        isOpen={!!revisionModalItem}
        onClose={() => setRevisionModalItem(null)}
        title="Minta Pengajar Merevisi Laporan"
        icon={AlertCircle}
        maxWidth="md"
      >
        {revisionModalItem && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              Tuliskan catatan perbaikan atau instruksi revisi yang wajib dilengkapi oleh guru <strong>{revisionModalItem.teacher.name}</strong>:
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Catatan Instruksi Revisi <span className="text-rose-500">*</span>:
              </label>
              <textarea
                required
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Contoh: Tolong lengkapi materi pembelajaran yang disampaikan, perjelas perkembangan siswa, dan lampirkan foto pengerjaan modul..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
              />
            </div>

            <div className="bg-orange-50 p-3 rounded-xl border border-orange-200 text-[11px] text-orange-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-orange-900">
                <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> Alur Status Perlu Revisi:
              </div>
              <p className="leading-relaxed text-orange-900">
                Status sesi akan diubah menjadi <strong>Perlu Revisi (NeedRevision)</strong>. Guru akan melihat catatan ini di menu presensi dan diminta memperbarui laporan evaluasinya untuk diajukan kembali ke Anda.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setRevisionModalItem(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRevision}
                disabled={!revisionNotes.trim() || executeApprovalMutation.isPending}
                className="h-9 px-5 text-xs font-bold rounded-xl shadow-md bg-orange-600 hover:bg-orange-700 text-white"
              >
                {executeApprovalMutation.isPending ? 'Mengirim...' : 'Kirim Catatan Revisi'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. MODAL: TOLAK PERMANEN (INVALID) */}
      <Modal
        isOpen={!!rejectConfirmItem}
        onClose={() => setRejectConfirmItem(null)}
        title="Tolak Sesi Secara Permanen (Tidak Valid)"
        icon={XCircle}
        maxWidth="md"
      >
        {rejectConfirmItem && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menolak sesi mengajar guru <strong>{rejectConfirmItem.teacher.name}</strong> secara permanen?
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Alasan Penolakan Permanen (Opsional):
              </label>
              <textarea
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Contoh: Sesi dibatalkan karena tidak ada bukti kehadiran siswa dan tidak sesuai jadwal..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
              />
            </div>

            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-[11px] text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-3.5 h-3.5" /> Konsekuensi Tolak Permanen:
              </div>
              <p className="leading-relaxed">
                Status sesi akan diubah menjadi <strong>Tidak Valid (Invalid)</strong> dan dianggap hangus. Sesi ini <strong>tidak akan masuk ke penggajian</strong> dan tidak dapat diajukan revisi oleh guru.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setRejectConfirmItem(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                disabled={executeApprovalMutation.isPending}
                className="h-9 px-5 text-xs font-bold rounded-xl shadow-md"
              >
                {executeApprovalMutation.isPending ? 'Menolak...' : 'Ya, Tolak Permanen'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 8. MODAL: LIHAT DETAIL JURNAL EVALUASI */}
      <Modal
        isOpen={!!detailModalItem}
        onClose={() => setDetailModalItem(null)}
        title="Detail Jurnal Hasil Belajar Siswa"
        icon={FileText}
        maxWidth="lg"
      >
        {detailModalItem && (
          <div className="space-y-4">
            {/* Header Profil Sesi */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Guru Pengajar</span>
                <span className="font-bold text-slate-900">{detailModalItem.teacher.name}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{detailModalItem.teacher.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Siswa Bimbingan</span>
                <span className="font-bold text-slate-900">{detailModalItem.student.name}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Kelas: {detailModalItem.student.grade}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Tanggal & Jam Belajar</span>
                <span className="font-bold text-slate-900">{detailModalItem.date}</span>
                <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                  {detailModalItem.check_in} {detailModalItem.check_out ? `- ${detailModalItem.check_out}` : ''}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Status Laporan</span>
                <span className="font-bold text-slate-900">{detailModalItem.status}</span>
                {detailModalItem.approved_at && (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Diproses: {format(new Date(detailModalItem.approved_at), 'dd MMM yyyy, HH:mm')}
                  </span>
                )}
              </div>
            </div>

            {/* Jurnal Isi Materi & Catatan */}
            {detailModalItem.session_log ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Materi & Aktivitas Pembelajaran (Pertemuan Ke-{detailModalItem.session_log.session_number}):</span>
                  </h4>
                  <div
                    className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100"
                    dangerouslySetInnerHTML={{ __html: formatRichContent(detailModalItem.session_log.activities) }}
                  />
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Catatan Perkembangan Siswa:</span>
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100 italic">
                    {detailModalItem.session_log.notes || 'Tidak ada catatan tambahan.'}
                  </p>
                </div>

                {detailModalItem.session_log.photo_url && (
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2">
                    <h4 className="font-bold text-xs text-slate-900">Dokumentasi / Foto Evaluasi:</h4>
                    <div className="overflow-hidden rounded-xl border border-slate-200 max-h-60 bg-slate-900/5">
                      <img
                        src={detailModalItem.session_log.photo_url}
                        alt="Foto Jurnal"
                        className="w-full h-auto object-contain max-h-60"
                      />
                    </div>
                  </div>
                )}

                {detailModalItem.approval_notes && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold">Catatan Atasan / Revisi:</div>
                    <p className="italic">{detailModalItem.approval_notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                Guru belum mengisi jurnal evaluasi sesi ini.
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2.5 pt-3.5 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailModalItem(null)}
                className="w-full sm:w-auto h-9 px-4 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Tutup
              </Button>

              <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto">
                {detailModalItem.status !== 'Invalid' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRejectConfirmItem(detailModalItem);
                      setRejectNotes(detailModalItem.approval_notes || '');
                      setDetailModalItem(null);
                    }}
                    className="h-9 px-2 sm:px-3 text-xs font-bold rounded-xl text-rose-700 border-rose-300 hover:bg-rose-50 flex items-center justify-center gap-1"
                    title="Tolak Sesi Secara Permanen"
                  >
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Tolak</span>
                  </Button>
                )}

                {detailModalItem.status !== 'NeedRevision' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRevisionModalItem(detailModalItem);
                      setRevisionNotes(detailModalItem.approval_notes || '');
                      setDetailModalItem(null);
                    }}
                    className="h-9 px-2 sm:px-3 text-xs font-bold rounded-xl text-orange-800 border-orange-300 hover:bg-orange-50 flex items-center justify-center gap-1"
                    title="Minta Guru Merevisi Laporan"
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Revisi</span>
                  </Button>
                )}

                {detailModalItem.status !== 'Valid' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setApproveConfirmItem(detailModalItem);
                      setDetailModalItem(null);
                    }}
                    className="h-9 px-2.5 sm:px-4 text-xs font-bold rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1"
                    title="Setujui Laporan Evaluasi (ACC)"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">ACC</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
