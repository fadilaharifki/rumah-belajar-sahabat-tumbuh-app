'use client';

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2, Clock, ShieldCheck, FileText, Plus, AlertTriangle, X, Check,
  UserCheck, AlertCircle, Edit3, Trash2, Calendar, Hash, Sparkles, Filter, ArrowDown, Camera
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  usePresensiQuery,
  useInfinitePresensiQuery,
  useCheckInMutation,
  useSubmitSessionLogMutation,
  useManualVerifyMutation,
  useDeletePresensiMutation,
  PresensiItem
} from '@/hooks/queries/usePresensiQueries';
import { useGuruQuery } from '@/hooks/queries/useGuruQueries';
import { useSiswaQuery } from '@/hooks/queries/useSiswaQueries';
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
import { format } from 'date-fns';

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

  const teacherOptions = useMemo(() => {
    return teachers.map((t) => ({
      value: t.id,
      label: t.name,
      subLabel: t.email
    }));
  }, [teachers]);

  const studentOptions = useMemo(() => {
    return students.map((st) => ({
      value: st.id,
      label: st.name,
      subLabel: st.grade
    }));
  }, [students]);

  const checkInMutation = useCheckInMutation();
  const submitSessionLogMutation = useSubmitSessionLogMutation();
  const manualVerifyMutation = useManualVerifyMutation();
  const deletePresensiMutation = useDeletePresensiMutation();

  const [activeTab, setActiveTab] = useState<'semua' | 'pending'>('semua');
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Form State for 1-Click Check-In
  const [ciTeacherId, setCiTeacherId] = useState('');
  const [ciStudentId, setCiStudentId] = useState('');
  const [ciCheckInTime, setCiCheckInTime] = useState(() => new Date().toTimeString().slice(0, 5));

  // Modal State for Session Log Submission
  const [logTargetPresensi, setLogTargetPresensi] = useState<PresensiItem | null>(null);
  const [logSessionNumber, setLogSessionNumber] = useState<number>(1);
  const [logActivities, setLogActivities] = useState('');
  const [logNotes, setLogNotes] = useState('');

  // Modal State for Admin Manual Verification
  const [manualVerifyTarget, setManualVerifyTarget] = useState<PresensiItem | null>(null);
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

  // Filter pending reports (Checked in, but report not filled yet)
  const pendingReports = useMemo(() => {
    return presensiList.filter((p) => p.status === 'CheckIn' || !p.session_log);
  }, [presensiList]);

  const mobilePendingReports = useMemo(() => {
    return mobilePresensiList.filter((p) => p.status === 'CheckIn' || !p.session_log);
  }, [mobilePresensiList]);

  const handleOpenCheckInModal = () => {
    setCiCheckInTime(new Date().toTimeString().slice(0, 5));
    setIsCheckInOpen(true);
  };

  const handle1ClickCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const tId = user?.role === 'teacher' && user?.teacher_id ? user.teacher_id : (ciTeacherId || teachers[0]?.id);
    const sId = ciStudentId || students[0]?.id;

    if (!tId || !sId) return;

    await checkInMutation.mutateAsync({
      teacher_id: tId,
      student_id: sId,
      check_in: ciCheckInTime || new Date().toTimeString().slice(0, 5)
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

  const desktopDisplayList = activeTab === 'pending' ? pendingReports : presensiList;
  const mobileDisplayList = activeTab === 'pending' ? mobilePendingReports : mobilePresensiList;

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
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
                }`}
            >
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-900 shrink-0" />
              <span>Menunggu Laporan ({pendingReports.length})</span>
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
        maxWidth="md"
      >
        <form onSubmit={handle1ClickCheckIn} className="space-y-4">
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
                onClick={() => setCiCheckInTime(new Date().toTimeString().slice(0, 5))}
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
              * Default terisi jam sekarang. Ketuk <strong className="text-emerald-700 font-bold">seluruh kotak</strong> untuk memilih jam, atau tombol <strong className="text-emerald-700 font-bold">"Atur Jam Sekarang"</strong>.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCheckInOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={checkInMutation.isPending || !ciStudentId} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
              {checkInMutation.isPending ? 'Menyimpan...' : 'Konfirmasi Check-In'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. REUSABLE MODAL / BOTTOM SHEET: ISI LAPORAN BELAJAR */}
      <Modal
        isOpen={!!logTargetPresensi}
        onClose={() => setLogTargetPresensi(null)}
        title="Isi Laporan Belajar Siswa"
        icon={FileText}
        maxWidth="md"
      >
        {logTargetPresensi && (
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

            <form onSubmit={handleLogSubmit} className="space-y-3">
              <div>
                <Label required className="text-xs font-bold text-slate-700 mb-1">Pertemuan Ke-:</Label>
                <div className="relative">
                  <Input
                    required
                    type="number"
                    min={1}
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
                <textarea
                  required
                  rows={2.5}
                  value={logActivities}
                  onChange={(e) => setLogActivities(e.target.value)}
                  placeholder="Contoh: Belajar Perkalian & Pembagian 1-10..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div>
                <Label required className="text-xs font-bold text-slate-700 mb-1">Evaluasi :</Label>
                <textarea
                  required
                  rows={2.5}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder="Contoh: Ananda lancar perkalian 5, bimbingan lanjutan di rumah..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setLogTargetPresensi(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={submitSessionLogMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
                  {submitSessionLogMutation.isPending ? 'Menyimpan...' : 'Simpan Laporan'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* 3. REUSABLE MODAL / BOTTOM SHEET: VALIDASI MANUAL ADMIN */}
      <Modal
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
      </Modal>

      {/* 4. REUSABLE MODAL / BOTTOM SHEET: KONFIRMASI HAPUS */}
      <Modal
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
      </Modal>



      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : (
        <>
          {/* VERSION 1: WEB / DESKTOP VIEW (TABLE FORMAT) - Visible on md screens (>=768px) */}
          <Card className="hidden md:block p-0 overflow-hidden bg-white shadow-sm border border-slate-200 rounded-2xl">
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
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar src={item.teacher_photo} name={item.teacher_name} size="sm" />
                              <span className="font-bold text-slate-900">{item.teacher_name}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center gap-2">
                              <Avatar src={item.student_avatar} name={item.student_name} size="sm" />
                              <div>
                                <div className="font-bold text-slate-900">{item.student_name}</div>
                                <span className="text-[10px] text-amber-800 font-bold">{item.student_grade}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 max-w-xs">
                            {item.session_log ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-emerald-100 text-emerald-900">
                                  <Hash className="w-2.5 h-2.5" /> ke-{item.session_log.session_number || 1}
                                </span>
                                <p className="font-semibold text-slate-900 truncate">{item.session_log.activities}</p>
                                <p className="text-[11px] text-emerald-950 font-semibold italic truncate">"{item.session_log.results_recommendations}"</p>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenLogModal(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 transition cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3 text-amber-700" />
                                <span>+ Isi Laporan</span>
                              </button>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                            {item.status === 'Valid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Terverifikasi</span>
                              </span>
                            ) : item.status === 'ManualVerified' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                                <ShieldCheck className="w-3 h-3 text-blue-600" />
                                <span>Manual</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Pending</span>
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {!isValid && can('update', 'presensi') && (
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
                        Belum ada rekaman presensi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* VERSION 2: MOBILE VIEW (COMPACT CARDS WITH TANSTACK QUERY INFINITE SCROLL) - Visible on small screens (<768px) */}
          <div className="block md:hidden space-y-3">
            {mobileDisplayList.length > 0 ? (
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
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-700" />
                                <span>Pending</span>
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
                          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md font-bold text-[9px] bg-emerald-200 text-emerald-950">
                                <Hash className="w-2.5 h-2.5" /> ke-{item.session_log.session_number || 1}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-800 uppercase">Jurnal</span>
                            </div>

                            <p className="text-slate-900 font-medium line-clamp-1 leading-snug">
                              🎯 {item.session_log.activities}
                            </p>
                            <p className="text-emerald-950 font-semibold italic line-clamp-1 leading-snug">
                              ✨ "{item.session_log.results_recommendations}"
                            </p>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-center space-y-1.5">
                            <p className="text-amber-900 font-semibold text-[10px]">⚠️ Laporan belum diisi</p>
                            <button
                              onClick={() => handleOpenLogModal(item)}
                              className="w-full py-1 px-2 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> + Isi Laporan Belajar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                        <div>
                          {!isValid && can('update', 'presensi') && (
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
                  {activeTab === 'pending'
                    ? `Tidak ada sesi yang menunggu laporan di periode ${monthLabel}. 🎉`
                    : `Belum ada rekaman presensi pada periode ${monthLabel}.`}
                </p>
                <p className="text-[11px] text-slate-400">Gunakan filter Bulan & Tahun untuk melihat periode lainnya.</p>
              </Card>
            )}

            {/* Mobile TanStack Query Infinite Scroll Trigger */}
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
                  {isFetchingNextPage ? 'Memuat Presensi Berikutnya...' : '👇 Muat Lebih Banyak Presensi'}
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
