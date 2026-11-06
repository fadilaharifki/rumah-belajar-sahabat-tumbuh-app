'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, Clock, ShieldCheck, FileText, Plus, AlertTriangle, X, Check,
  UserCheck, AlertCircle, Edit3, Trash2, Calendar, Hash, Sparkles, Filter, ArrowDown, Camera, Eye, BookOpen
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  usePresensiQuery,
  useInfinitePresensiQuery,
  useCheckInMutation,
  useSubmitSessionLogMutation,
  useManualVerifyMutation,
  useApprovalPresensiMutation,
  useDeletePresensiMutation,
  PresensiItem
} from '@/hooks/queries/usePresensiQueries';
import { useGuruQuery } from '@/hooks/queries/useGuruQueries';
import { useSiswaQuery } from '@/hooks/queries/useSiswaQueries';
import { useJadwalQuery } from '@/hooks/queries/useJadwalQueries';
import { toast } from '@/stores/useToastStore';
import { useAbility } from '@/hooks/useAbility';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Badge } from '@/components/atoms/Badge';
import { Avatar } from '@/components/atoms/Avatar';
import { Label } from '@/components/atoms/Label';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { DatePicker } from '@/components/atoms/DatePicker';
import { TimePicker } from '@/components/atoms/TimePicker';
import { Modal } from '@/components/atoms/Modal';
import { Skeleton, SkeletonTable } from '@/components/atoms/Skeleton';
import { RichTextEditor } from '@/components/molecules/RichTextEditor';
import { format } from 'date-fns';

function formatRichContent(text?: string): string {
  if (!text) return '-';
  const hasHtml = /<[a-z][\s\S]*>/i.test(text);
  if (hasHtml) return text;
  return text.replace(/\n/g, '<br />');
}

function getPlainTextSnippet(htmlText?: string): string {
  if (!htmlText) return '';
  return htmlText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function PresensiPage() {
  const { user } = useAuthStore();
  const { can } = useAbility();

  // Date Filter State (Month & Year)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedMonth = format(selectedDate, 'yyyy-MM');
  const monthLabel = format(selectedDate, 'MMMM yyyy');

  // TanStack Queries (Regular for Desktop, Infinite for Mobile)
  const { data: allPresensiList = [], isLoading } = usePresensiQuery();
  const {
    data: infinitePresensiData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfinitePresensiQuery(undefined, 6);

  const { data: teachers = [] } = useGuruQuery();
  const { data: students = [] } = useSiswaQuery();
  const { data: allSchedules = [] } = useJadwalQuery();

  // Resolved teacher record for current logged-in user
  const loggedInTeacher = useMemo(() => {
    if (!user) return null;
    return teachers.find(
      (t) =>
        t.id === user.teacher_id ||
        t.user_id === user.id ||
        (user.email && t.email?.toLowerCase() === user.email.toLowerCase())
    ) || null;
  }, [teachers, user]);

  // Form State for 1-Click Check-In
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [ciTeacherId, setCiTeacherId] = useState('');
  const [ciStudentId, setCiStudentId] = useState('');
  const [ciSessionDate, setCiSessionDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [ciCheckInTime, setCiCheckInTime] = useState(() => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }));

  const canBypassSchedule = can('bypass_schedule', 'presensi');

  const effectiveTeacherId = useMemo(() => {
    if (user?.role === 'teacher') {
      return loggedInTeacher?.id || user.teacher_id || '';
    }
    return ciTeacherId || loggedInTeacher?.id || '';
  }, [user, loggedInTeacher, ciTeacherId]);

  // Indonesian Day of Week & Date in WIB
  const DAYS_OF_WEEK_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
  const sessionDateObj = useMemo(() => {
    if (!ciSessionDate) return new Date();
    const [y, m, d] = ciSessionDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [ciSessionDate]);
  const currentDayName = DAYS_OF_WEEK_ID[sessionDateObj.getDay()];

  // Set of student IDs scheduled on selected date with effective teacher
  const studentsWithTodaySchedule = useMemo(() => {
    if (!effectiveTeacherId) return new Set<string>();
    const set = new Set<string>();
    allSchedules.forEach((sch) => {
      if (sch.teacher_id === effectiveTeacherId && sch.day_of_week === currentDayName && sch.status !== 'Nonaktif') {
        set.add(sch.student_id);
      }
    });
    return set;
  }, [allSchedules, effectiveTeacherId, currentDayName]);

  const teacherOptions = useMemo(() => {
    return teachers.map((t) => ({
      value: t.id,
      label: t.name,
      subLabel: t.email
    }));
  }, [teachers]);

  const studentOptions = useMemo(() => {
    return students
      .filter((st) => st.status !== 'Nonaktif' && !st.is_deleted)
      .map((st) => {
        const hasTodaySch = studentsWithTodaySchedule.has(st.id);
        const todaySch = allSchedules.find(
          (s) => s.student_id === st.id && s.teacher_id === effectiveTeacherId && s.day_of_week === currentDayName && s.status !== 'Nonaktif'
        );

        return {
          value: st.id,
          label: hasTodaySch
            ? `${st.name} ⭐ (${currentDayName}: ${todaySch?.start_time || '14:00'} - ${todaySch?.end_time || '15:00'})`
            : st.name,
          subLabel: hasTodaySch
            ? `Kelas: ${st.grade} • Terjadwal ${currentDayName} (${todaySch?.room || 'Ruang Kelas'})`
            : `Kelas: ${st.grade} • Tidak ada jadwal ${currentDayName}`,
          hasTodaySch
        };
      })
      .sort((a, b) => {
        if (a.hasTodaySch && !b.hasTodaySch) return -1;
        if (!a.hasTodaySch && b.hasTodaySch) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [students, studentsWithTodaySchedule, allSchedules, effectiveTeacherId, currentDayName]);

  // Selected Student Schedule Validation
  const selectedStudentScheduleToday = useMemo(() => {
    if (!ciStudentId || !effectiveTeacherId) return null;
    return allSchedules.find(
      (s) => s.student_id === ciStudentId && s.teacher_id === effectiveTeacherId && s.day_of_week === currentDayName && s.status !== 'Nonaktif'
    ) || null;
  }, [ciStudentId, effectiveTeacherId, allSchedules, currentDayName]);

  const selectedStudentOtherSchedules = useMemo(() => {
    if (!ciStudentId) return [];
    return allSchedules.filter((s) => s.student_id === ciStudentId && s.status !== 'Nonaktif');
  }, [ciStudentId, allSchedules]);

  const checkInMutation = useCheckInMutation();
  const submitSessionLogMutation = useSubmitSessionLogMutation();
  const manualVerifyMutation = useManualVerifyMutation();
  const approvalMutation = useApprovalPresensiMutation();
  const deletePresensiMutation = useDeletePresensiMutation();

  const [activeTab, setActiveTab] = useState<'semua' | 'pending_approval' | 'revision' | 'valid' | 'invalid' | 'need_report'>('semua');

  // Auto-switch to pending approval tab if opened from dashboard banner (?tab=pending)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('tab') === 'pending') {
        setActiveTab('pending_approval');
      }
    }
  }, []);

  // Modal State for Session Log Submission
  const [logTargetPresensi, setLogTargetPresensi] = useState<PresensiItem | null>(null);
  const [logSessionNumber, setLogSessionNumber] = useState<number>(1);
  const [logActivities, setLogActivities] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [viewDetailLogItem, setViewDetailLogItem] = useState<PresensiItem | null>(null);

  // Modal State for Admin Manual Verification & Approval Rejection
  const [manualVerifyTarget, setManualVerifyTarget] = useState<PresensiItem | null>(null);
  const [rejectModalTarget, setRejectModalTarget] = useState<PresensiItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<PresensiItem | null>(null);

  // Role-Based Data Scoping + Month & Year Filter (Desktop List)
  // Combined Desktop Presensi Filter
  const presensiList = useMemo(() => {
    return allPresensiList.filter((p) => {
      const matchMonth = p.date.startsWith(selectedMonth);
      if (!matchMonth) return false;

      if (user?.role === 'teacher' && user?.teacher_id) {
        return p.teacher_id === user.teacher_id;
      }
      if (user?.role === 'parent' && user?.parent_id) {
        const myStudentIds = new Set(students.filter((st: any) => st.parent_id === user.parent_id).map((st) => st.id));
        return myStudentIds.has(p.student_id);
      }
      return true;
    });
  }, [allPresensiList, user, students, selectedMonth]);

  // Combined Infinite Scroll List for Mobile View
  const mobilePresensiList = useMemo(() => {
    if (!infinitePresensiData?.pages) return presensiList;
    const allInfinite = infinitePresensiData.pages.flatMap((page) => page.items);

    return allInfinite.filter((p) => {
      const matchMonth = p.date.startsWith(selectedMonth);
      if (!matchMonth) return false;

      if (user?.role === 'teacher' && user?.teacher_id) {
        return p.teacher_id === user.teacher_id;
      }
      if (user?.role === 'parent' && user?.parent_id) {
        const myStudentIds = new Set(students.filter((st: any) => st.parent_id === user.parent_id).map((st) => st.id));
        return myStudentIds.has(p.student_id);
      }
      return true;
    });
  }, [infinitePresensiData, presensiList, user, students, selectedMonth]);

  // Categorized Presensi Lists for Status Tabs
  const pendingApprovalList = useMemo(() => {
    return presensiList.filter((p) => p.status === 'PendingApproval');
  }, [presensiList]);

  const revisionList = useMemo(() => {
    return presensiList.filter((p) => p.status === 'NeedRevision');
  }, [presensiList]);

  const validList = useMemo(() => {
    return presensiList.filter((p) => p.status === 'Valid' || p.status === 'ManualVerified');
  }, [presensiList]);

  const invalidList = useMemo(() => {
    return presensiList.filter((p) => p.status === 'Invalid');
  }, [presensiList]);

  const needReportList = useMemo(() => {
    return presensiList.filter((p) => p.status === 'CheckIn' || !p.session_log);
  }, [presensiList]);

  const mobilePendingApprovalList = useMemo(() => {
    return mobilePresensiList.filter((p) => p.status === 'PendingApproval');
  }, [mobilePresensiList]);

  const mobileRevisionList = useMemo(() => {
    return mobilePresensiList.filter((p) => p.status === 'NeedRevision');
  }, [mobilePresensiList]);

  const mobileValidList = useMemo(() => {
    return mobilePresensiList.filter((p) => p.status === 'Valid' || p.status === 'ManualVerified');
  }, [mobilePresensiList]);

  const mobileInvalidList = useMemo(() => {
    return mobilePresensiList.filter((p) => p.status === 'Invalid');
  }, [mobilePresensiList]);

  const mobileNeedReportList = useMemo(() => {
    return mobilePresensiList.filter((p) => p.status === 'CheckIn' || !p.session_log);
  }, [mobilePresensiList]);

  const desktopDisplayList = useMemo(() => {
    if (activeTab === 'pending_approval') return pendingApprovalList;
    if (activeTab === 'revision') return revisionList;
    if (activeTab === 'valid') return validList;
    if (activeTab === 'invalid') return invalidList;
    if (activeTab === 'need_report') return needReportList;
    return presensiList;
  }, [activeTab, pendingApprovalList, revisionList, validList, invalidList, needReportList, presensiList]);

  const mobileDisplayList = useMemo(() => {
    if (activeTab === 'pending_approval') return mobilePendingApprovalList;
    if (activeTab === 'revision') return mobileRevisionList;
    if (activeTab === 'valid') return mobileValidList;
    if (activeTab === 'invalid') return mobileInvalidList;
    if (activeTab === 'need_report') return mobileNeedReportList;
    return mobilePresensiList;
  }, [activeTab, mobilePendingApprovalList, mobileRevisionList, mobileValidList, mobileInvalidList, mobileNeedReportList, mobilePresensiList]);

  const handleOpenCheckInModal = () => {
    setCiSessionDate(format(new Date(), 'yyyy-MM-dd'));
    setCiCheckInTime(new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }));
    setIsCheckInOpen(true);
  };

  const handle1ClickCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const tId = effectiveTeacherId;
    const sId = ciStudentId;

    if (!tId || !sId) {
      toast.warning('Pilih guru dan siswa terlebih dahulu!');
      return;
    }

    if (!selectedStudentScheduleToday && !canBypassSchedule) {
      toast.error('Check-In ditolak! Sesi ini tidak sesuai dengan jadwal belajar siswa.');
      return;
    }

    const sessionDateWib = ciSessionDate || format(new Date(), 'yyyy-MM-dd');
    const nowTimeWib = ciCheckInTime || new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

    await checkInMutation.mutateAsync({
      teacher_id: tId,
      student_id: sId,
      schedule_id: selectedStudentScheduleToday?.id || null,
      date: sessionDateWib,
      check_in: nowTimeWib,
      bypass_schedule: Boolean(canBypassSchedule && !selectedStudentScheduleToday)
    });

    setCiTeacherId('');
    setCiStudentId('');
    setIsCheckInOpen(false);
  };

  const handleOpenLogModal = (item: PresensiItem) => {
    setLogTargetPresensi(item);
    setLogActivities(item.session_log?.activities || '');
    setLogNotes(item.session_log?.results_recommendations || '');

    const existingCount = presensiList.filter(
      (p) => p.student_id === item.student_id && (p.status === 'Valid' || p.status === 'ManualVerified' || Boolean(p.session_log))
    ).length;

    setLogSessionNumber(item.session_log?.session_number || (existingCount + 1));
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTargetPresensi) return;

    await submitSessionLogMutation.mutateAsync({
      attendance_id: logTargetPresensi.id,
      teacher_id: logTargetPresensi.teacher_id,
      student_id: logTargetPresensi.student_id,
      session_number: Number(logSessionNumber) || 1,
      activities: logActivities,
      results_recommendations: logNotes,
      session_date: logTargetPresensi.date
    });

    setLogTargetPresensi(null);
  };

  const handleApprove = async (item: PresensiItem) => {
    await approvalMutation.mutateAsync({
      id: item.id,
      status: 'Valid',
      approved_by: user?.id
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModalTarget) return;
    await approvalMutation.mutateAsync({
      id: rejectModalTarget.id,
      status: 'Invalid',
      approved_by: user?.id,
      approval_notes: rejectionReason
    });
    setRejectModalTarget(null);
    setRejectionReason('');
  };

  const confirmManualVerify = async () => {
    if (!manualVerifyTarget) return;
    const id = manualVerifyTarget.id;
    setManualVerifyTarget(null);
    await manualVerifyMutation.mutateAsync({ id, status: 'ManualVerified' });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await deletePresensiMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-3.5 max-w-6xl mx-auto px-1 sm:px-0">
      {/* Integrated Ultra-Efficient Presensi Toolbar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        {/* Row 1: Title & Primary Check-In Action Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Camera className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 leading-tight truncate">
                {user?.role === 'teacher' ? 'Presensi Sesi Saya' : user?.role === 'parent' ? 'Riwayat Presensi Anak Saya' : 'Presensi Sesi Mengajar'}
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block truncate">
                {user?.role === 'teacher'
                  ? `Riwayat presensi & laporan belajar (${user?.full_name || ''}).`
                  : user?.role === 'parent'
                    ? `Bukti kehadiran guru & jurnal belajar putra/putri.`
                    : 'Check-In 1-Klik terpasang dengan Laporan Belajar Siswa.'}
              </p>
            </div>
          </div>

          {user?.role !== 'parent' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCheckInModal}
              className="shadow-xs text-xs font-bold h-8.5 sm:h-9 px-3 sm:px-4 rounded-xl shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-amber-300" /> Check-In
            </Button>
          )}
        </div>

        {/* Row 2: Filter Tabs (Kiri) + Month Filter (Kanan) - Icon Only di Mobile, Full Text di Desktop */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          {/* Tabs Filter (Kiri) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0">
            <button
              onClick={() => setActiveTab('semua')}
              className={`px-2.5 py-1 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'semua'
                ? 'bg-emerald-600 text-amber-300 shadow-2xs font-extrabold'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
            >
              Semua ({presensiList.length})
            </button>

            <button
              onClick={() => setActiveTab('pending_approval')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'pending_approval'
                ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
                }`}
            >
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-700 shrink-0" />
              <span>Menunggu Approval ({pendingApprovalList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('revision')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'revision'
                ? 'bg-orange-600 text-white shadow-2xs font-extrabold'
                : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/60'
                }`}
            >
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-600 shrink-0" />
              <span>Perlu Revisi ({revisionList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('valid')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'valid'
                ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
            >
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 shrink-0" />
              <span>Valid ({validList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('invalid')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'invalid'
                ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
                }`}
            >
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-600 shrink-0" />
              <span>Tidak Valid ({invalidList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('need_report')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'need_report'
                ? 'bg-slate-700 text-white shadow-2xs font-extrabold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
            >
              <Edit3 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 shrink-0" />
              <span>Belum Laporan ({needReportList.length})</span>
            </button>

            <div className="hidden lg:flex text-[11px] font-bold text-slate-500 items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 whitespace-nowrap shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Periode: <strong className="text-slate-900 font-mono">{monthLabel}</strong></span>
            </div>
          </div>

          {/* Month Picker DatePicker (Kanan) - Icon Only di Mobile, Full Text di Desktop */}
          <div className="shrink-0 ml-auto">
            <DatePicker
              mode="month"
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              placeholder="Pilih Bulan"
              align="right"
              iconOnly
              className="sm:hidden"
            />
            <DatePicker
              mode="month"
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              placeholder="Pilih Bulan"
              align="right"
              className="hidden sm:block w-40"
            />
          </div>
        </div>
      </div>

      {/* 1. REUSABLE MODAL / BOTTOM SHEET: CHECK-IN SESI MENGAJAR */}
      <Modal
        isOpen={isCheckInOpen && user?.role !== 'parent'}
        onClose={() => setIsCheckInOpen(false)}
        title="Check-In Sesi Mengajar"
        icon={CheckCircle2}
        maxWidth="lg"
      >
        <form onSubmit={handle1ClickCheckIn} className="space-y-4">
          {/* Container Tanggal Sesi Belajar (WIB) */}
          <div className="bg-slate-50/90 border border-slate-200/80 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <Label required className="text-xs font-extrabold text-slate-800">
                  Hari & Tanggal Sesi (WIB):
                </Label>
              </div>

              {canBypassSchedule && (
                <button
                  type="button"
                  onClick={() => setCiSessionDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] shadow-2xs transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" /> Hari Ini
                </button>
              )}
            </div>

            {canBypassSchedule ? (
              <DatePicker
                mode="date"
                value={ciSessionDate}
                onChange={(d) => setCiSessionDate(format(d, 'yyyy-MM-dd'))}
                placeholder="Pilih Tanggal Sesi"
                align="left"
                className="w-full"
              />
            ) : (
              <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-900 font-mono shadow-2xs">
                {currentDayName}, {format(sessionDateObj, 'dd MMMM yyyy')} (WIB)
              </div>
            )}
          </div>

          <div className={`grid grid-cols-1 ${user?.role !== 'teacher' ? 'sm:grid-cols-2' : ''} gap-3`}>
            {user?.role !== 'teacher' && (
              <div>
                <Label required className="text-xs font-bold text-slate-700 mb-1">Pilih Guru Pengajar:</Label>
                <Select
                  options={teacherOptions}
                  value={ciTeacherId}
                  onChange={(val) => setCiTeacherId(val)}
                  placeholder="-- Cari Guru Pengajar --"
                  isSearchable
                  isClearable
                />
              </div>
            )}

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Pilih Siswa Bimbingan:</Label>
              <Select
                options={studentOptions}
                value={ciStudentId}
                onChange={(val) => setCiStudentId(val)}
                placeholder="-- Cari Siswa Bimbingan --"
                isSearchable
                isClearable
              />
            </div>
          </div>

          {/* Card Verifikasi Jadwal Siswa */}
          {ciStudentId && (
            <div>
              {selectedStudentScheduleToday ? (
                <div className="bg-emerald-50/90 border border-emerald-300 p-3 rounded-2xl text-xs text-emerald-900 space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Jadwal Sesuai & Terverifikasi:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Siswa terdaftar pada hari <strong>{currentDayName}</strong> pukul{' '}
                    <strong className="font-mono text-emerald-950">
                      {selectedStudentScheduleToday.start_time} - {selectedStudentScheduleToday.end_time} WIB
                    </strong>{' '}
                    di <strong>{selectedStudentScheduleToday.room || 'Ruang Kelas'}</strong>.
                  </p>
                </div>
              ) : canBypassSchedule ? (
                <div className="bg-amber-50 border border-amber-300 p-3 rounded-2xl text-xs text-amber-900 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Di Luar Jadwal Rutin Siswa (Mode Khusus / Bypass)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    Siswa tidak terdaftar di jadwal rutin hari <strong>{currentDayName}</strong> bersama guru ini.{' '}
                    {selectedStudentOtherSchedules.length > 0 ? (
                      <>
                        Jadwal terdaftar siswa: <strong>{selectedStudentOtherSchedules.map((s) => `${s.day_of_week} (${s.start_time}-${s.end_time})`).join(', ')}</strong>.
                      </>
                    ) : (
                      'Siswa belum memiliki jadwal rutin.'
                    )}
                  </p>
                  <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                    ✓ Izin RBAC aktif: Anda dapat mengonfirmasi sesi ini sebagai Sesi Tambahan / Pengganti.
                  </p>
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-300 p-3 rounded-2xl text-xs text-rose-900 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Tidak Sesuai Jadwal Siswa!</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    {selectedStudentOtherSchedules.length === 0 ? (
                      'Siswa ini belum memiliki jadwal bimbingan belajar aktif di sistem. Silakan daftarkan jadwal di menu Jadwal Ngajar terlebih dahulu.'
                    ) : selectedStudentOtherSchedules.some((s) => s.day_of_week === currentDayName) ? (
                      <>
                        Pada hari <strong>{currentDayName}</strong>, siswa ini dijadwalkan belajar bersama{' '}
                        <strong>
                          {selectedStudentOtherSchedules.find((s) => s.day_of_week === currentDayName)?.teacher_name || 'guru lain'}
                        </strong>{' '}
                        (pukul {selectedStudentOtherSchedules.find((s) => s.day_of_week === currentDayName)?.start_time} -{' '}
                        {selectedStudentOtherSchedules.find((s) => s.day_of_week === currentDayName)?.end_time} WIB).
                      </>
                    ) : (
                      <>
                        Siswa tidak memiliki jadwal bimbingan pada hari <strong>{currentDayName}</strong>. Jadwal belajar siswa terdaftar:{' '}
                        <strong>
                          {selectedStudentOtherSchedules
                            .map((s) => `${s.day_of_week} (${s.start_time}-${s.end_time})`)
                            .join(', ')}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Premium Container Jam Check-In */}
          <div className="bg-slate-50/90 border border-slate-200/80 p-3.5 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <Label required className="text-xs font-extrabold text-slate-800">
                  Jam Check-In (WIB):
                </Label>
              </div>

              <button
                type="button"
                onClick={() => setCiCheckInTime(new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] shadow-2xs transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" /> Atur Jam Sekarang
              </button>
            </div>

            <TimePicker
              value={ciCheckInTime}
              onChange={(t) => setCiCheckInTime(t)}
            />

            <p className="text-[10px] text-slate-500 font-medium leading-normal">
              * Default terisi jam sekarang.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCheckInOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button
              variant={!selectedStudentScheduleToday && !canBypassSchedule ? 'outline' : 'primary'}
              size="sm"
              type="submit"
              disabled={checkInMutation.isPending || !ciStudentId || (!selectedStudentScheduleToday && !canBypassSchedule)}
              className={`h-9 px-5 text-xs font-bold rounded-xl shadow-md ${!selectedStudentScheduleToday && !canBypassSchedule
                ? 'opacity-60 cursor-not-allowed bg-rose-50 text-rose-700 border-rose-200'
                : !selectedStudentScheduleToday && canBypassSchedule
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
            >
              {checkInMutation.isPending
                ? 'Menyimpan...'
                : !ciStudentId
                  ? 'Pilih Siswa Terlebih Dahulu'
                  : !selectedStudentScheduleToday && !canBypassSchedule
                    ? 'Jadwal Siswa Tidak Sesuai'
                    : !selectedStudentScheduleToday && canBypassSchedule
                      ? 'Konfirmasi Check-In (Sesi Khusus)'
                      : 'Konfirmasi Check-In'}
            </Button>
          </div>
        </form>
      </Modal >

      {/* 2. REUSABLE MODAL / BOTTOM SHEET: ISI LAPORAN BELAJAR */}
      < Modal
        isOpen={!!logTargetPresensi
        }
        onClose={() => setLogTargetPresensi(null)}
        title={logTargetPresensi?.status === 'NeedRevision' || (logTargetPresensi?.status === 'Invalid' && logTargetPresensi?.approval_notes) ? "✏️ Revisi Laporan Belajar Siswa" : "Isi Laporan Belajar Siswa"}
        icon={FileText}
        maxWidth="md"
      >
        {logTargetPresensi && (() => {
          const todayJakarta = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
          const isPastCutoff = logTargetPresensi.date < todayJakarta;
          const isRevision = logTargetPresensi.status === 'NeedRevision' || (logTargetPresensi.status === 'Invalid' && Boolean(logTargetPresensi.approval_notes));
          const isLocked = isPastCutoff && user?.role === 'teacher' && !isRevision;

          return (
            <div className="space-y-3.5">
              <div className="bg-emerald-50 p-3 rounded-xl text-xs space-y-0.5 border border-emerald-200">
                <p className="text-emerald-900">
                  <strong>Guru:</strong> {logTargetPresensi.teacher_name}
                </p>
                <p className="text-emerald-900">
                  <strong>Siswa:</strong> {logTargetPresensi.student_name} ({logTargetPresensi.student_grade})
                </p>
                <p className="text-emerald-700 font-mono text-[11px]">Tanggal Sesi: {logTargetPresensi.date}</p>
              </div>

              {isRevision && logTargetPresensi.approval_notes && (
                <div className="bg-orange-50 border-2 border-orange-300 p-3.5 rounded-xl text-xs text-orange-950 space-y-1.5 shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-orange-900">
                    <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                    <span>Catatan / Arahan Revisi dari Atasan:</span>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-lg border border-orange-200 text-xs font-semibold text-orange-950 leading-relaxed break-words">
                    {logTargetPresensi.approval_notes}
                  </div>
                  <p className="text-[11px] text-orange-800 italic">
                    Silakan perbaiki atau lengkapi isi jurnal pembelajaran di bawah ini sesuai arahan atasan, kemudian klik simpan untuk diajukan kembali ke atasan.
                  </p>
                </div>
              )}

              {isPastCutoff && !isRevision && (
                <div className="bg-rose-50 border border-rose-300 p-3 rounded-xl text-xs text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Batas Waktu Pengisian Laporan Telah Berakhir</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    Laporan evaluasi wajib disubmit maksimal pukul 23:59 WIB pada hari jadwal belajar ({logTargetPresensi.date}). {isLocked ? 'Form saat ini terkunci untuk pengajar.' : 'Sebagai Pemilik/Admin, Anda dapat mengisi atau memperbarui laporan ini.'}
                  </p>
                </div>
              )}

              <div className="bg-amber-50/80 border border-amber-200/90 p-2.5 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Status setelah disimpan: <strong>Menunggu Approval Atasan</strong>.</span>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-3">
                <div>
                  <Label required className="text-xs font-bold text-slate-700 mb-1">Pertemuan Ke-:</Label>
                  <div className="relative">
                    <Input
                      required
                      type="number"
                      min={1}
                      disabled={isLocked}
                      value={logSessionNumber}
                      onChange={(e) => setLogSessionNumber(Number(e.target.value))}
                      placeholder="1"
                      className="font-bold text-emerald-800 text-xs pl-8 h-9"
                    />
                    <Hash className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <Label required className="text-xs font-bold text-slate-700 mb-1">Materi / Aktivitas Belajar:</Label>
                  <RichTextEditor
                    value={logActivities}
                    onChange={setLogActivities}
                    placeholder="Contoh: Belajar Perkalian & Pembagian 1-10..."
                    minHeight="90px"
                  />
                </div>

                <div>
                  <Label required className="text-xs font-bold text-slate-700 mb-1">Evaluasi / Hasil Belajar:</Label>
                  <RichTextEditor
                    value={logNotes}
                    onChange={setLogNotes}
                    placeholder="Contoh: Ananda lancar perkalian 5, bimbingan lanjutan di rumah..."
                    minHeight="90px"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" type="button" onClick={() => setLogTargetPresensi(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                    Batal
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={isLocked || submitSessionLogMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                    {submitSessionLogMutation.isPending ? 'Menyimpan...' : 'Simpan Laporan'}
                  </Button>
                </div>
              </form>
            </div>
          );
        })()}
      </Modal >

      {/* 3. REUSABLE MODAL / BOTTOM SHEET: VALIDASI MANUAL ADMIN */}
      < Modal
        isOpen={!!manualVerifyTarget}
        onClose={() => setManualVerifyTarget(null)}
        title="Validasi Manual Admin"
        icon={ShieldCheck}
        maxWidth="sm"
      >
        {manualVerifyTarget && (
          <div className="space-y-3.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              Validasi manual sesi mengajar <strong>{manualVerifyTarget.teacher_name}</strong> dengan siswa <strong>{manualVerifyTarget.student_name}</strong> ({manualVerifyTarget.date})? Sesi ini akan langsung sah terhitung di Payroll.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setManualVerifyTarget(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="primary" size="sm" onClick={confirmManualVerify} className="h-9 px-4 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                Ya, Validasi
              </Button>
            </div>
          </div>
        )}
      </Modal >

      {/* 4. REUSABLE MODAL / BOTTOM SHEET: KONFIRMASI HAPUS */}
      < Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Konfirmasi Hapus"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-slate-600">Apakah Anda yakin ingin menghapus rekod presensi ini?</p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button variant="danger" size="sm" onClick={confirmDelete} className="h-9 px-4 text-xs font-bold rounded-xl shadow-md">
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal >

      {/* 5. MODAL DETAIL LAPORAN SESI BELAJAR */}
      < Modal
        isOpen={Boolean(viewDetailLogItem)}
        onClose={() => setViewDetailLogItem(null)}
        title="Detail Laporan Sesi Pembelajaran"
        icon={FileText}
        maxWidth="lg"
      >
        {viewDetailLogItem && viewDetailLogItem.session_log && (() => {
          const isSelfReport = Boolean(user?.teacher_id && user.teacher_id === viewDetailLogItem.teacher_id);
          const currentStatus = viewDetailLogItem.status;

          return (
            <div className="space-y-4">
              {/* Header Metadata Box */}
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-md font-mono text-[11px]">
                      Pertemuan ke-{viewDetailLogItem.session_log.session_number || 1}
                    </span>
                    <span className="text-slate-600 font-mono text-[11px]">{viewDetailLogItem.date} • {viewDetailLogItem.check_in} WIB ({viewDetailLogItem.duration_minutes || 60}m)</span>
                  </div>

                  <div>
                    {currentStatus === 'Valid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Valid (Disetujui)</span>
                      </span>
                    ) : currentStatus === 'ManualVerified' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Manual Verified</span>
                      </span>
                    ) : currentStatus === 'Invalid' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Tidak Valid (Ditolak)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Menunggu Approval</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Guru Pengajar</span>
                    <p className="font-bold text-slate-900 truncate" title={viewDetailLogItem.teacher_name}>
                      {viewDetailLogItem.teacher_name}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Siswa Bimbingan</span>
                    <p className="font-bold text-slate-900 truncate" title={viewDetailLogItem.student_name}>
                      {viewDetailLogItem.student_name} <span className="text-amber-800 text-[11px] font-bold">({viewDetailLogItem.student_grade})</span>
                    </p>
                  </div>
                </div>

                {/* Audit Timestamps */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/80 font-mono text-[10px] text-slate-600">
                  <span>Disubmit: <strong className="text-slate-800">{viewDetailLogItem.session_log.created_at ? new Date(viewDetailLogItem.session_log.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB' : viewDetailLogItem.date}</strong></span>
                  {viewDetailLogItem.session_log.updated_at && (
                    <span>Diperbarui: <strong className="text-slate-800">{new Date(viewDetailLogItem.session_log.updated_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB'}</strong></span>
                  )}
                </div>
              </div>

              {/* Catatan Penolakan jika ada */}
              {(viewDetailLogItem.session_log.rejection_reason || viewDetailLogItem.approval_notes) && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Catatan / Alasan Penolakan dari Atasan:</span>
                  </div>
                  <p className="text-rose-950 font-medium leading-relaxed pl-5.5">
                    {viewDetailLogItem.session_log.rejection_reason || viewDetailLogItem.approval_notes}
                  </p>
                </div>
              )}

              {/* Content Boxes */}
              <div className="space-y-3.5">
                {/* Materi & Aktivitas Belajar */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-slate-700 border-b border-slate-200/80 pb-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>Materi & Aktivitas Belajar:</span>
                  </div>
                  <div
                    className="rich-text-content text-slate-800 font-normal text-xs sm:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatRichContent(viewDetailLogItem.session_log.activities) }}
                  />
                </div>

                {/* Evaluasi & Hasil Belajar */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/90 to-amber-50/70 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-emerald-900 border-b border-emerald-200/80 pb-2">
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span>Evaluasi & Hasil Belajar:</span>
                  </div>
                  <div
                    className="rich-text-content text-emerald-950 font-normal text-xs sm:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatRichContent(viewDetailLogItem.session_log.results_recommendations) }}
                  />
                </div>
              </div>

              {/* Approval Actions Box for Approver / Pemilik */}
              {can('approve', 'presensi') && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Tindakan Approval Atasan:</span>
                    <span className="text-[11px] text-slate-500">
                      {isSelfReport
                        ? '⚠️ Laporan sendiri: persetujuan harus dilakukan oleh Pemilik Utama.'
                        : 'Verifikasi kesesuaian materi & evaluasi sebelum dihitung ke honor.'}
                    </span>
                  </div>

                  {!isSelfReport ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={approvalMutation.isPending}
                        onClick={() => {
                          const target = viewDetailLogItem;
                          setViewDetailLogItem(null);
                          setRejectModalTarget(target);
                          setRejectionReason(target.approval_notes || '');
                        }}
                        className="h-8.5 px-3 text-xs font-bold rounded-xl"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Tolak
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={approvalMutation.isPending}
                        onClick={async () => {
                          const target = viewDetailLogItem;
                          await handleApprove(target);
                          setViewDetailLogItem(null);
                        }}
                        className="h-8.5 px-3.5 text-xs font-bold rounded-xl shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Setujui (Valid)
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                      Anti-Self Approval Active
                    </span>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    const target = viewDetailLogItem;
                    setViewDetailLogItem(null);
                    handleOpenLogModal(target);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Edit Laporan Ini
                </button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewDetailLogItem(null)}
                  className="h-9 text-xs font-bold px-4 rounded-xl"
                >
                  Tutup
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal >

      {/* 6. MODAL TOLAK LAPORAN EVALUASI */}
      < Modal
        isOpen={Boolean(rejectModalTarget)}
        onClose={() => setRejectModalTarget(null)}
        title="Tolak Laporan Evaluasi (Tidak Valid)"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        <div className="space-y-3.5">
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            Berikan catatan revisi atau alasan penolakan agar guru yang bersangkutan dapat memperbaiki laporan evaluasinya.
          </p>
          <div>
            <Label required className="text-xs font-bold text-slate-700 mb-1">Alasan Penolakan / Catatan Revisi:</Label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Materi belum lengkap, mohon lengkapi catatan pengerjaan soal siswa..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRejectModalTarget(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={!rejectionReason.trim() || approvalMutation.isPending}
              onClick={handleConfirmReject}
              className="h-9 px-4 text-xs font-bold rounded-xl shadow-md"
            >
              {approvalMutation.isPending ? 'Menyimpan...' : 'Tolak Laporan'}
            </Button>
          </div>
        </div>
      </Modal >



      {
        isLoading ? (
          <SkeletonTable rows={4} />
        ) : (
          <>
            {/* VERSION 1: WEB / DESKTOP VIEW (TABLE FORMAT) - Visible on md screens (>=768px) */}
            < Card className="hidden md:block p-0 overflow-hidden bg-white shadow-sm border border-slate-200 rounded-2xl" >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-medium">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                      <th className="px-3.5 py-2.5">Tanggal & Jam</th>
                      <th className="px-3.5 py-2.5">Pengajar</th>
                      <th className="px-3.5 py-2.5">Siswa</th>
                      <th className="px-3.5 py-2.5">Jurnal & Laporan</th>
                      <th className="px-3.5 py-2.5 text-center">Status Sesi</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {desktopDisplayList.length > 0 ? (
                      desktopDisplayList.map((item) => {
                        const isValid = item.status === 'Valid' || item.status === 'ManualVerified';
                        return (
                          <tr key={item.id} className="hover:bg-emerald-50/20 transition">
                            <td className="px-3.5 py-2.5 font-mono">
                              <div className="font-bold text-slate-900">{item.date}</div>
                              <div className="text-[11px] text-slate-500 font-medium">{item.check_in} WIB ({item.duration_minutes || 60}m)</div>
                            </td>
                            <td className="px-3.5 py-2.5 max-w-[150px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar src={item.teacher_photo} name={item.teacher_name} size="sm" className="shrink-0" />
                                <span className="font-bold text-slate-900 truncate" title={item.teacher_name}>{item.teacher_name}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 max-w-[150px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar src={item.student_avatar} name={item.student_name} size="sm" className="shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 truncate" title={item.student_name}>{item.student_name}</div>
                                  <span className="text-[10px] text-amber-800 font-bold block truncate">{item.student_grade}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 max-w-xs">
                              {item.session_log ? (
                                <div
                                  onClick={() => setViewDetailLogItem(item)}
                                  className="space-y-0.5 cursor-pointer hover:bg-emerald-50/50 p-1.5 rounded-xl transition border border-transparent hover:border-emerald-200"
                                  title="Klik untuk lihat detail laporan"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-emerald-100 text-emerald-900">
                                      <Hash className="w-2.5 h-2.5" /> ke-{item.session_log.session_number || 1}
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                                      <Eye className="w-3 h-3" /> Detail
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-xs pt-0.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                      <p className="text-slate-800 font-medium line-clamp-1 truncate text-xs">
                                        {getPlainTextSnippet(item.session_log.activities) || 'Belum ada materi'}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                      <p className="text-emerald-950 font-medium italic line-clamp-1 truncate text-[11px]">
                                        {getPlainTextSnippet(item.session_log.results_recommendations) || 'Belum ada evaluasi'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleOpenLogModal(item)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition cursor-pointer ${item.status === 'NeedRevision'
                                    ? 'bg-orange-100 text-orange-900 hover:bg-orange-200 border border-orange-300'
                                    : item.status === 'Invalid'
                                      ? 'bg-rose-100 text-rose-900 hover:bg-rose-200 border border-rose-300'
                                      : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                    }`}
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>{item.status === 'NeedRevision' ? '✏️ Revisi Laporan' : item.status === 'Invalid' ? 'Tolak (Invalid)' : '+ Isi Laporan'}</span>
                                </button>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                              {item.status === 'Valid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Valid</span>
                                </span>
                              ) : item.status === 'ManualVerified' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                                  <span>Manual</span>
                                </span>
                              ) : item.status === 'PendingApproval' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Menunggu Approval</span>
                                </span>
                              ) : item.status === 'NeedRevision' ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
                                    <AlertCircle className="w-3 h-3 text-orange-600" />
                                    <span>Perlu Revisi</span>
                                  </span>
                                  {item.approval_notes && (
                                    <div className="text-[10px] text-orange-900 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg text-left max-w-[210px] whitespace-normal leading-tight shadow-2xs">
                                      <strong className="block text-orange-950 font-bold">Catatan Revisi:</strong>
                                      <span className="line-clamp-2">{item.approval_notes}</span>
                                    </div>
                                  )}
                                </div>
                              ) : item.status === 'Invalid' ? (
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>Tidak Valid</span>
                                  </span>
                                  {item.approval_notes && (
                                    <div className="text-[10px] text-rose-800 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg text-left max-w-[210px] whitespace-normal leading-tight shadow-2xs">
                                      <strong className="block text-rose-900 font-bold">Alasan Penolakan:</strong>
                                      <span className="line-clamp-2">{item.approval_notes}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>Check-In</span>
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {/* Quick Approver Actions */}
                                {can('approve', 'presensi') && (
                                  <>
                                    {user?.teacher_id && user.teacher_id === item.teacher_id ? (
                                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded" title="Guru tidak bisa meng-approve laporannya sendiri">
                                        Perlu ACC Pemilik
                                      </span>
                                    ) : (
                                      <>
                                        {item.status !== 'Valid' && item.session_log && (
                                          <button
                                            onClick={() => handleApprove(item)}
                                            disabled={approvalMutation.isPending}
                                            className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition"
                                            title="Setujui Laporan Evaluasi (Valid)"
                                          >
                                            <Check className="w-3.5 h-3.5" /> ACC
                                          </button>
                                        )}
                                        {item.status !== 'Invalid' && item.session_log && (
                                          <button
                                            onClick={() => {
                                              setRejectModalTarget(item);
                                              setRejectionReason(item.approval_notes || '');
                                            }}
                                            className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                                            title="Tolak Laporan Evaluasi (Tidak Valid)"
                                          >
                                            <X className="w-3.5 h-3.5" /> Tolak
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}

                                {item.session_log && (
                                  <button
                                    onClick={() => setViewDetailLogItem(item)}
                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                    title="Lihat Detail Laporan"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                {!isValid && can('update', 'presensi') && !can('approve', 'presensi') && (
                                  <button
                                    onClick={() => setManualVerifyTarget(item)}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                    title="Validasi Manual Admin"
                                  >
                                    <ShieldCheck className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenLogModal(item)}
                                  className="p-1 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Edit Laporan"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {can('delete', 'presensi') && (
                                  <button
                                    onClick={() => setDeleteTarget(item)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                                    title="Hapus Presensi"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-400">
                          {activeTab === 'pending_approval'
                            ? `Tidak ada sesi yang menunggu approval di periode ${monthLabel}. 🎉`
                            : activeTab === 'need_report'
                              ? `Tidak ada sesi yang menunggu laporan di periode ${monthLabel}. 🎉`
                              : activeTab === 'valid'
                                ? `Belum ada sesi valid di periode ${monthLabel}.`
                                : activeTab === 'invalid'
                                  ? `Tidak ada laporan yang ditolak di periode ${monthLabel}.`
                                  : `Belum ada rekaman presensi pada periode ${monthLabel}.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card >

            {/* VERSION 2: MOBILE VIEW (COMPACT CARDS WITH TANSTACK QUERY INFINITE SCROLL) - Visible on small screens (<768px) */}
            < div className="block md:hidden space-y-3" >
              {
                mobileDisplayList.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {mobileDisplayList.map((item) => {
                      const isValid = item.status === 'Valid' || item.status === 'ManualVerified';

                      return (
                        <Card
                          key={item.id}
                          className="p-3.5 space-y-2.5 bg-white border border-slate-200 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition relative flex flex-col justify-between rounded-2xl"
                        >
                          <div className="space-y-2.5">
                            {/* Compact Header: Date & Status Badge */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 gap-1.5">
                              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{item.date}</span>
                                <span className="text-[10px] text-slate-400 font-normal">• {item.check_in} WIB</span>
                              </div>

                              <div>
                                {item.status === 'Valid' ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Valid</span>
                                  </span>
                                ) : item.status === 'ManualVerified' ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                                    <span>Manual</span>
                                  </span>
                                ) : item.status === 'PendingApproval' ? (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    <Clock className="w-3 h-3 text-amber-700" />
                                    <span>Menunggu Approval</span>
                                  </span>
                                ) : item.status === 'Invalid' ? (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      <span>Tidak Valid</span>
                                    </span>
                                    {item.approval_notes && (
                                      <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded max-w-[170px] truncate" title={item.approval_notes}>
                                        Revisi: {item.approval_notes}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span>Check-In</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Compact Profiles: Guru & Siswa */}
                            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar src={item.teacher_photo} name={item.teacher_name} size="sm" className="shrink-0" />
                                <div className="truncate">
                                  <span className="text-[9px] font-bold uppercase text-slate-400 block leading-tight">Guru:</span>
                                  <h4 className="font-bold text-slate-900 truncate leading-tight">{item.teacher_name}</h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar src={item.student_avatar} name={item.student_name} size="sm" className="shrink-0" />
                                <div className="truncate">
                                  <span className="text-[9px] font-bold uppercase text-slate-400 block leading-tight">Siswa:</span>
                                  <h4 className="font-bold text-slate-900 truncate leading-tight">{item.student_name}</h4>
                                </div>
                              </div>
                            </div>

                            {/* Session Log Progress Details */}
                            {item.session_log ? (
                              <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg font-extrabold text-[10px] bg-emerald-200 text-emerald-950">
                                    <Hash className="w-3 h-3 text-emerald-800" /> Sesi ke-{item.session_log.session_number || 1}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">Jurnal</span>
                                </div>

                                <div className="space-y-1.5 text-xs pt-0.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                    <p className="text-slate-800 font-medium line-clamp-1 truncate text-xs">
                                      {getPlainTextSnippet(item.session_log.activities) || 'Belum ada materi'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                                    <p className="text-emerald-950 font-medium italic line-clamp-1 truncate text-xs">
                                      {getPlainTextSnippet(item.session_log.results_recommendations) || 'Belum ada evaluasi'}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => setViewDetailLogItem(item)}
                                  className="w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-white hover:bg-emerald-100 text-emerald-950 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs border border-emerald-300/80 mt-1"
                                >
                                  <Eye className="w-3.5 h-3.5 text-emerald-700" /> Lihat Detail Laporan
                                </button>
                              </div>
                            ) : (
                              <div className={`p-2.5 rounded-xl border text-[11px] text-center space-y-1.5 ${item.status === 'Invalid' ? 'bg-rose-50/80 border-rose-200' : 'bg-amber-50/80 border-amber-200'
                                }`}>
                                <p className={`font-semibold text-[10px] ${item.status === 'Invalid' ? 'text-rose-900 font-bold' : 'text-amber-900'}`}>
                                  {item.status === 'Invalid' ? '⚠️ Laporan Ditolak / Butuh Revisi' : '⚠️ Laporan belum diisi'}
                                </p>
                                {item.approval_notes && (
                                  <p className="text-[10px] text-rose-800 bg-white/80 p-1.5 rounded-lg border border-rose-200 text-left leading-snug">
                                    <strong>Catatan Atasan:</strong> {item.approval_notes}
                                  </p>
                                )}
                                <button
                                  onClick={() => handleOpenLogModal(item)}
                                  className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center gap-1 ${item.status === 'Invalid'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                    }`}
                                >
                                  <Edit3 className="w-3 h-3" /> {item.status === 'Invalid' ? '✏️ Revisi Laporan Belajar' : '+ Isi Laporan Belajar'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Card Actions Footer */}
                          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                            <div className="flex items-center gap-1">
                              {can('approve', 'presensi') && (
                                <>
                                  {user?.teacher_id && user.teacher_id === item.teacher_id ? (
                                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      Perlu ACC Pemilik
                                    </span>
                                  ) : (
                                    <>
                                      {item.status !== 'Valid' && item.session_log && (
                                        <button
                                          onClick={() => handleApprove(item)}
                                          disabled={approvalMutation.isPending}
                                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-0.5 cursor-pointer shadow-xs"
                                        >
                                          <Check className="w-3 h-3" /> ACC
                                        </button>
                                      )}
                                      {item.status !== 'Invalid' && item.session_log && (
                                        <button
                                          onClick={() => {
                                            setRejectModalTarget(item);
                                            setRejectionReason(item.approval_notes || '');
                                          }}
                                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <X className="w-3 h-3" /> Tolak
                                        </button>
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                              {!isValid && can('update', 'presensi') && !can('approve', 'presensi') && (
                                <button
                                  onClick={() => setManualVerifyTarget(item)}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
                                  title="Validasi Manual Admin"
                                >
                                  <ShieldCheck className="w-3 h-3 text-blue-600" /> Manual
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenLogModal(item)}
                                className="p-1 px-2 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer flex items-center gap-1 font-semibold text-[10px]"
                                title="Edit Laporan Sesi"
                              >
                                <Edit3 className="w-3 h-3 text-slate-500" /> Edit
                              </button>

                              {can('delete', 'presensi') && (
                                <button
                                  onClick={() => setDeleteTarget(item)}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Hapus Presensi"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-500" />
                                </button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-slate-400 space-y-1.5">
                    <Calendar className="w-7 h-7 mx-auto text-slate-300" />
                    <p className="font-semibold text-xs text-slate-600">
                      {activeTab === 'pending_approval'
                        ? `Tidak ada sesi yang menunggu approval di periode ${monthLabel}. 🎉`
                        : activeTab === 'need_report'
                          ? `Tidak ada sesi yang menunggu laporan di periode ${monthLabel}. 🎉`
                          : activeTab === 'valid'
                            ? `Belum ada sesi valid di periode ${monthLabel}.`
                            : activeTab === 'invalid'
                              ? `Tidak ada laporan yang ditolak di periode ${monthLabel}.`
                              : `Belum ada rekaman presensi pada periode ${monthLabel}.`}
                    </p>
                    <p className="text-[11px] text-slate-400">Gunakan filter Bulan & Tahun untuk melihat periode lainnya.</p>
                  </Card>
                )
              }

              {/* Mobile TanStack Query Infinite Scroll Trigger */}
              {
                hasNextPage && (
                  <div className="pt-2 text-center">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="w-full text-xs font-bold py-2.5 bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50 shadow-xs justify-center"
                    >
                      <ArrowDown className="w-4 h-4 mr-1 text-emerald-600 animate-bounce" />
                      {isFetchingNextPage ? 'Memuat Presensi Berikutnya...' : '👇 Muat Lebih Banyak Presensi'}
                    </Button>
                  </div>
                )
              }
            </div >
          </>
        )}
    </div >
  );
}
