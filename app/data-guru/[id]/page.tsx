'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, ClipboardList, GraduationCap, Calculator, ShieldCheck,
  MessageCircle, Calendar, Plus, Clock, MapPin, Trash2, Edit3, X, AlertTriangle,
  CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  useGuruDetailQuery,
  useUpdatePayrollMutation
} from '@/hooks/queries/useGuruQueries';
import { useSiswaQuery } from '@/hooks/queries/useSiswaQueries';
import {
  useCreateJadwalMutation,
  useUpdateJadwalMutation,
  useDeleteJadwalMutation,
  ScheduleItem
} from '@/hooks/queries/useJadwalQueries';
import { useAbility } from '@/hooks/useAbility';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card } from '@/components/atoms/Card';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { Select } from '@/components/atoms/Select';
import { DatePicker } from '@/components/atoms/DatePicker';
import { Skeleton } from '@/components/atoms/Skeleton';
import { formatRupiah, formatWaUrl } from '@/utils/formatters';
import { format } from 'date-fns';

export default function DetailGuruPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;
  const { can } = useAbility();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'absensi' | 'jadwal' | 'murid' | 'payroll'>('jadwal');
  const [selectedDateObj, setSelectedDateObj] = useState<Date>(new Date());

  const selectedMonth = format(selectedDateObj, 'yyyy-MM');
  const selectedMonthLabel = format(selectedDateObj, 'MMMM yyyy');

  // TanStack Query for full Teacher Details
  const { data: detailData, isLoading, isError } = useGuruDetailQuery(teacherId, selectedMonth);
  const { data: allStudents = [] } = useSiswaQuery();

  const studentOptions = useMemo(() => {
    return allStudents.map((st) => ({
      value: st.id,
      label: st.name,
      subLabel: st.grade
    }));
  }, [allStudents]);

  const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const dayOptions = useMemo(() => {
    return daysList.map((d) => ({
      value: d,
      label: d
    }));
  }, [daysList]);

  const payrollStatusOptions = [
    { value: 'Lunas', label: '🟢 Lunas (Telah Ditransfer)' },
    { value: 'Pending', label: '🟡 Pending (Menunggu Persetujuan)' },
    { value: 'Draft', label: '⚪ Draft (Dalam Rekapitulasi)' }
  ];

  const createJadwalMutation = useCreateJadwalMutation();
  const updateJadwalMutation = useUpdateJadwalMutation();
  const deleteJadwalMutation = useDeleteJadwalMutation();
  const updatePayrollMutation = useUpdatePayrollMutation();

  // Form & Modal States for Schedules
  const [isAddJadwalOpen, setIsAddJadwalOpen] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState<ScheduleItem | null>(null);
  const [deleteTargetJadwal, setDeleteTargetJadwal] = useState<ScheduleItem | null>(null);

  // Form State for Adding Schedule for this Teacher
  const [jStudentId, setJStudentId] = useState('');
  const [jDay, setJDay] = useState('Senin');
  const [jStartTime, setJStartTime] = useState('14:00');
  const [jEndTime, setJEndTime] = useState('15:30');
  const [jRoom, setJRoom] = useState('Ruang Utama');

  // Form State for Editing Schedule
  const [editStudentId, setEditStudentId] = useState('');
  const [editDay, setEditDay] = useState('Senin');
  const [editStartTime, setEditStartTime] = useState('14:00');
  const [editEndTime, setEditEndTime] = useState('15:30');
  const [editRoom, setEditRoom] = useState('Ruang Utama');

  const teacher = detailData?.teacher;
  const attendanceList = detailData?.attendance || [];
  const teacherSchedules = detailData?.schedules || [];
  const studentList = detailData?.students || [];
  const payroll = detailData?.payroll;

  const sessionRate = teacher?.session_rate || 85000;
  const totalSessions = attendanceList.length;
  const totalPayroll = payroll?.total_amount || totalSessions * sessionRate;
  const payrollStatus = payroll?.status || 'Lunas';

  const handleAddJadwalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jStudentId || !teacherId) return;

    await createJadwalMutation.mutateAsync({
      teacher_id: teacherId,
      student_id: jStudentId,
      day_of_week: jDay,
      start_time: jStartTime,
      end_time: jEndTime,
      room: jRoom
    });

    setJStudentId('');
    setJDay('Senin');
    setJStartTime('14:00');
    setJEndTime('15:30');
    setJRoom('Ruang Utama');
    setIsAddJadwalOpen(false);
  };

  const handleEditClick = (sch: ScheduleItem) => {
    setEditingJadwal(sch);
    setEditStudentId(sch.student_id);
    setEditDay(sch.day_of_week);
    setEditStartTime(sch.start_time);
    setEditEndTime(sch.end_time);
    setEditRoom(sch.room || 'Ruang Utama');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJadwal) return;

    await updateJadwalMutation.mutateAsync({
      id: editingJadwal.id,
      teacher_id: teacherId,
      student_id: editStudentId,
      day_of_week: editDay,
      start_time: editStartTime,
      end_time: editEndTime,
      room: editRoom
    });

    setEditingJadwal(null);
  };

  const confirmDeleteJadwal = async () => {
    if (!deleteTargetJadwal) return;
    const id = deleteTargetJadwal.id;
    setDeleteTargetJadwal(null);
    await deleteJadwalMutation.mutateAsync(id);
  };

  const handlePayrollStatusChange = async (newStatus: 'Lunas' | 'Pending' | 'Draft') => {
    await updatePayrollMutation.mutateAsync({
      teacher_id: teacherId,
      period_month: selectedMonth,
      total_sessions: totalSessions,
      rate_per_session: sessionRate,
      total_amount: totalPayroll,
      status: newStatus
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError || !teacher) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/data-guru')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Guru
        </button>

        <Card className="p-8 text-center space-y-3 bg-white border border-slate-200">
          <p className="text-slate-500 text-sm">Data guru tidak ditemukan atau telah dihapus.</p>
          <button
            onClick={() => router.push('/data-guru')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            Lihat Semua Guru
          </button>
        </Card>
      </div>
    );
  }

  const isAdminOrStaff = user.role === 'admin' || user.role === 'staff';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/data-guru')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-emerald-700 transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Guru
      </button>

      {/* Teacher Profile Header Card */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar
              src={teacher.photo_url || teacher.avatar_url}
              name={teacher.name}
              size="lg"
              className="ring-2 sm:ring-4 ring-emerald-500 shadow-md shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{teacher.name}</h1>
                <Badge variant={teacher.status === 'Aktif' ? 'emerald' : 'slate'} size="sm">
                  {teacher.status || 'Aktif'}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-mono mt-0.5">ID Guru: {teacher.id}</p>

              <div className="flex flex-wrap gap-3 sm:gap-4 text-xs font-medium text-slate-600 mt-2 sm:mt-3">
                <a
                  href={`mailto:${teacher.email}`}
                  className="flex items-center gap-1.5 hover:text-emerald-700 transition"
                  title="Kirim Email"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-none">{teacher.email}</span>
                </a>
                <a
                  href={formatWaUrl(teacher.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-900 transition"
                  title="Chat langsung via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="underline decoration-emerald-300 underline-offset-2">{teacher.phone}</span>
                </a>
              </div>

              {/* Subjek Mengajar */}
              <div className="flex flex-wrap gap-1 mt-3">
                {(teacher.subjects || ['Umum']).map((sub: string) => (
                  <Badge key={sub} variant="amber" size="sm">
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left sm:text-right space-y-1 w-full sm:w-56">
            <span className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">Tarif Honorarium:</span>
            <div className="text-base sm:text-lg font-bold text-emerald-900 font-mono">
              {formatRupiah(sessionRate)} <span className="text-xs font-normal">/ Sesi</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Custom Konfirmasi Hapus Jadwal */}
      {deleteTargetJadwal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-rose-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-800 font-semibold text-lg">
                <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span>Konfirmasi Hapus Jadwal</span>
              </div>
              <button onClick={() => setDeleteTargetJadwal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal sesi <strong>{teacher.name}</strong> dengan siswa <strong>{deleteTargetJadwal.student_name}</strong> pada hari {deleteTargetJadwal.day_of_week}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setDeleteTargetJadwal(null)}>
                Batal
              </Button>
              <Button variant="danger" onClick={confirmDeleteJadwal}>
                Ya, Hapus Jadwal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Jadwal */}
      {editingJadwal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Edit Jadwal Ngajar ({teacher.name})</h3>
              <button onClick={() => setEditingJadwal(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <Label required>Pilih Siswa Bimbingan:</Label>
                <Select
                  options={studentOptions}
                  value={editStudentId}
                  onChange={(val) => setEditStudentId(val)}
                  placeholder="-- Cari Siswa Bimbingan --"
                  isSearchable
                  isClearable
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>Hari Ngajar:</Label>
                  <Select
                    options={dayOptions}
                    value={editDay}
                    onChange={(val) => setEditDay(val)}
                    placeholder="Pilih Hari"
                    isSearchable={false}
                    isClearable={false}
                  />
                </div>

                <div>
                  <Label required>Ruangan:</Label>
                  <Input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label required>Jam Mulai:</Label>
                  <Input required type="time" value={editStartTime} onChange={(e) => setEditStartTime(e.target.value)} />
                </div>
                <div>
                  <Label required>Jam Selesai:</Label>
                  <Input required type="time" value={editEndTime} onChange={(e) => setEditEndTime(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setEditingJadwal(null)}>Batal</Button>
                <Button variant="primary" type="submit" disabled={updateJadwalMutation.isPending}>
                  {updateJadwalMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4 Detail Tabs & Action Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'jadwal'
                ? 'bg-emerald-600 text-amber-300 shadow-md shadow-emerald-200 font-extrabold'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Jadwal Ngajar ({teacherSchedules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('absensi')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'absensi'
                ? 'bg-emerald-600 text-amber-300 shadow-md shadow-emerald-200 font-extrabold'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4 shrink-0" />
            <span>Absensi ({attendanceList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('murid')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'murid'
                ? 'bg-emerald-600 text-amber-300 shadow-md shadow-emerald-200 font-extrabold'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            <span>Murid Bimbingan ({studentList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs transition cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-200 font-extrabold'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-4 h-4 shrink-0 text-emerald-800" />
            <span>Payroll ({payrollStatus})</span>
          </button>
        </div>

        {activeTab !== 'murid' && activeTab !== 'jadwal' && (
          <div className="w-full sm:w-56">
            <DatePicker
              mode="month"
              value={selectedDateObj}
              onChange={(d) => setSelectedDateObj(d)}
              placeholder="Pilih Periode Bulan"
            />
          </div>
        )}
      </div>

      {/* TAB 1: JADWAL NGAJAR GURU INI */}
      {activeTab === 'jadwal' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Jadwal Sesi Ngajar — {teacher.name}</h3>
              <p className="text-xs text-slate-500 font-medium">Jadwal mingguan bimbingan belajar khusus guru ini</p>
            </div>
            {can('create', 'jadwal') && (
              <Button variant="primary" size="sm" onClick={() => setIsAddJadwalOpen(!isAddJadwalOpen)}>
                <Plus className="w-4 h-4 mr-1 text-amber-300" /> Tambah Jadwal Guru Ini
              </Button>
            )}
          </div>

          {/* Form Slide-Down Tambah Jadwal untuk Guru ini */}
          {isAddJadwalOpen && (
            <Card variant="emerald" className="p-6 border-2 border-emerald-300 space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Tambah Jadwal Baru Untuk {teacher.name}</h3>
              <form onSubmit={handleAddJadwalSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label required>Pilih Siswa Bimbingan:</Label>
                  <Select
                    options={studentOptions}
                    value={jStudentId}
                    onChange={(val) => setJStudentId(val)}
                    placeholder="-- Cari Siswa Bimbingan --"
                    isSearchable
                    isClearable
                  />
                </div>

                <div>
                  <Label required>Hari Ngajar:</Label>
                  <Select
                    options={dayOptions}
                    value={jDay}
                    onChange={(val) => setJDay(val)}
                    placeholder="Pilih Hari"
                    isSearchable={false}
                    isClearable={false}
                  />
                </div>

                <div>
                  <Label required>Ruangan / Lokasi:</Label>
                  <Input value={jRoom} onChange={(e) => setJRoom(e.target.value)} placeholder="Ruang Utama" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label required>Jam Mulai:</Label>
                    <Input required type="time" value={jStartTime} onChange={(e) => setJStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label required>Jam Selesai:</Label>
                    <Input required type="time" value={jEndTime} onChange={(e) => setJEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-emerald-100">
                  <Button variant="outline" type="button" onClick={() => setIsAddJadwalOpen(false)}>Batal</Button>
                  <Button variant="primary" type="submit" disabled={createJadwalMutation.isPending || !jStudentId}>
                    {createJadwalMutation.isPending ? 'Menyimpan...' : 'Simpan Jadwal Guru'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Grid Jadwal Per Hari */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {daysList.map((day) => {
              const daySchedules = teacherSchedules.filter((s: any) => s.day_of_week === day);

              return (
                <Card key={day} className="p-4 space-y-3 bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>{day}</span>
                    </div>
                    <Badge variant="emerald" size="sm">
                      {daySchedules.length} Sesi
                    </Badge>
                  </div>

                  <div className="space-y-2.5">
                    {daySchedules.length > 0 ? (
                      daySchedules.map((sch: any) => (
                        <div
                          key={sch.id}
                          className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2 hover:shadow-sm transition relative group"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                              <Clock className="w-3 h-3 text-emerald-600" />
                              <span>{sch.start_time} - {sch.end_time}</span>
                            </span>

                            <div className="flex items-center gap-1">
                              {can('update', 'jadwal') && (
                                <button
                                  onClick={() => handleEditClick(sch)}
                                  className="p-1 text-slate-500 hover:text-emerald-700 rounded-md hover:bg-white cursor-pointer"
                                  title="Edit Jadwal"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {can('delete', 'jadwal') && (
                                <button
                                  onClick={() => setDeleteTargetJadwal(sch)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white cursor-pointer"
                                  title="Hapus Jadwal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="text-xs text-slate-800 font-semibold flex items-center gap-2.5">
                            <Avatar src={sch.student_avatar} name={sch.student_name} size="sm" className="ring-2 ring-amber-400/40 shadow-xs shrink-0" />
                            <span className="truncate">Siswa: <strong className="text-slate-900">{sch.student_name}</strong> ({sch.student_grade})</span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1.5 border-t border-emerald-100/60 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{sch.room}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        Belum ada jadwal di hari {day}.
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT ABSENSI */}
      {activeTab === 'absensi' && (
        <Card className="p-0 overflow-hidden bg-white shadow-sm border border-slate-200">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-xs text-slate-700">
            <span>Presensi — {teacher.name}</span>
            <span className="text-emerald-700 font-mono text-[11px] sm:text-xs">{selectedMonthLabel}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 sm:px-5 py-3.5">Tanggal</th>
                  <th className="px-4 sm:px-5 py-3.5">Siswa</th>
                  <th className="px-4 sm:px-5 py-3.5">Masuk</th>
                  <th className="px-4 sm:px-5 py-3.5">Keluar</th>
                  <th className="px-4 sm:px-5 py-3.5">Durasi</th>
                  <th className="px-4 sm:px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {attendanceList.length > 0 ? (
                  attendanceList.map((att: any) => (
                    <tr key={att.id} className="hover:bg-emerald-50/20 transition">
                      <td className="px-4 sm:px-5 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{att.date}</td>
                      <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">{att.student_name}</td>
                      <td className="px-4 sm:px-5 py-3.5 font-mono font-bold text-emerald-800">{att.check_in}</td>
                      <td className="px-4 sm:px-5 py-3.5 font-mono text-slate-600">{att.check_out || '-'}</td>
                      <td className="px-4 sm:px-5 py-3.5 font-mono font-bold text-slate-800">{att.duration_minutes}m</td>
                      <td className="px-4 sm:px-5 py-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{att.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Belum ada rekaman presensi pada periode bulan {selectedMonthLabel}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: DAFTAR MURID BIMBINGAN */}
      {activeTab === 'murid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {studentList.length > 0 ? (
            studentList.map((std: any) => (
              <Card key={std.id} className="p-4 sm:p-6 space-y-4 bg-white border border-slate-200 shadow-xs hover:shadow-md transition">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar src={std.avatar_url} name={std.name} size="lg" className="ring-2 ring-amber-400 shrink-0" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">{std.name}</h3>
                    <Badge variant="amber" size="sm" className="mt-1">
                      {std.grade}
                    </Badge>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1">Wali: {std.parent_name}</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <a
                    href={formatWaUrl(std.parent_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-mono text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition"
                    title="Chat Wali via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="underline decoration-emerald-300 underline-offset-2">{std.parent_phone}</span>
                  </a>
                  {std.notes && <p className="text-[11px] text-slate-500 italic mt-1 font-medium">"{std.notes}"</p>}
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
              Belum ada murid bimbingan yang terdaftar untuk guru ini.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REKAP PAYROLL INTEGRATED WITH SUPABASE DB */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {/* Admin / Staff Controls with Select Dropdown */}
          {isAdminOrStaff && (
            <Card className="p-4 bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900">Ubah Status Pelunasan Payroll ({selectedMonthLabel})</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Pilih status terkini untuk memperbarui data di Supabase DB.</p>
                </div>
              </div>

              {/* Status Select Dropdown with Color Indicators */}
              <div className="w-full sm:w-64">
                <Select
                  options={payrollStatusOptions}
                  value={payrollStatus}
                  onChange={(val) => handlePayrollStatusChange(val as any)}
                  isSearchable={false}
                  isClearable={false}
                  disabled={updatePayrollMutation.isPending}
                />
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card variant="emerald" className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-emerald-800 tracking-wider">
                Total Sesi ({selectedMonthLabel})
              </span>
              <div className="text-xl sm:text-2xl font-bold text-emerald-950 font-mono">{totalSessions} Sesi</div>
            </Card>

            <Card variant="default" className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-500 tracking-wider">Tarif Per Sesi</span>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">{formatRupiah(sessionRate)}</div>
            </Card>

            <Card variant="amber" className="p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase text-amber-900 tracking-wider">
                  Total Honor ({selectedMonthLabel})
                </span>
                <Badge
                  variant={payrollStatus === 'Lunas' ? 'emerald' : payrollStatus === 'Pending' ? 'amber' : 'slate'}
                  size="sm"
                >
                  {payrollStatus}
                </Badge>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-950 font-mono">{formatRupiah(totalPayroll)}</div>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden bg-white shadow-sm border border-slate-200">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-xs text-slate-700">
              <span>Rincian Honorarium</span>
              <span className="text-emerald-700 font-mono text-[11px] sm:text-xs">{selectedMonthLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 sm:px-5 py-3.5">ID</th>
                    <th className="px-4 sm:px-5 py-3.5">Tanggal</th>
                    <th className="px-4 sm:px-5 py-3.5">Siswa</th>
                    <th className="px-4 sm:px-5 py-3.5">Tarif</th>
                    <th className="px-4 sm:px-5 py-3.5 text-right">Honor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {attendanceList.length > 0 ? (
                    attendanceList.map((att: any, idx: number) => (
                      <tr key={att.id || idx} className="hover:bg-amber-50/20 transition">
                        <td className="px-4 sm:px-5 py-3.5 font-mono text-slate-500">#S-{idx + 101}</td>
                        <td className="px-4 sm:px-5 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{att.date}</td>
                        <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">{att.student_name}</td>
                        <td className="px-4 sm:px-5 py-3.5 font-mono text-slate-600">{formatRupiah(sessionRate)}</td>
                        <td className="px-4 sm:px-5 py-3.5 text-right font-mono font-bold text-emerald-800">
                          {formatRupiah(sessionRate)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        Tidak ada rincian honorarium pada bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
