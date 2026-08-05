'use client';

import React, { useState, useMemo } from 'react';
import {
  CalendarDays, Plus, Edit3, Trash2, Clock, UserCheck, GraduationCap, X, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  useJadwalQuery,
  useCreateJadwalMutation,
  useUpdateJadwalMutation,
  useDeleteJadwalMutation,
  ScheduleItem
} from '@/hooks/queries/useJadwalQueries';
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
import { Modal } from '@/components/atoms/Modal';
import { Skeleton } from '@/components/atoms/Skeleton';
import { toast } from '@/stores/useToastStore';

export default function JadwalPage() {
  const { user } = useAuthStore();
  const { can } = useAbility();

  // TanStack Queries
  const { data: schedules = [], isLoading: isJadwalLoading } = useJadwalQuery();
  const { data: teachers = [], isLoading: isGuruLoading } = useGuruQuery();
  const { data: students = [], isLoading: isSiswaLoading } = useSiswaQuery();

  const createJadwalMutation = useCreateJadwalMutation();
  const updateJadwalMutation = useUpdateJadwalMutation();
  const deleteJadwalMutation = useDeleteJadwalMutation();

  const [activeDayFilter, setActiveDayFilter] = useState<string>('Semua');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState<ScheduleItem | null>(null);
  const [deleteTargetJadwal, setDeleteTargetJadwal] = useState<ScheduleItem | null>(null);

  // Form State for Adding New Schedule
  const [jTeacherId, setJTeacherId] = useState('');
  const [jStudentId, setJStudentId] = useState('');
  const [jDay, setJDay] = useState('Senin');
  const [jStartTime, setJStartTime] = useState('14:00');
  const [jEndTime, setJEndTime] = useState('15:00');
  const [jRoom, setJRoom] = useState('Ruang Utama');

  // Edit Form State
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editDay, setEditDay] = useState('Senin');
  const [editStartTime, setEditStartTime] = useState('14:00');
  const [editEndTime, setEditEndTime] = useState('15:00');
  const [editRoom, setEditRoom] = useState('Ruang Utama');

  const teacherOptions = useMemo(
    () => teachers.map((t) => ({ label: `${t.name} (${t.subjects?.join(', ') || 'Umum'})`, value: t.id })),
    [teachers]
  );

  const studentOptions = useMemo(
    () => students.map((s) => ({ label: `${s.name} - ${s.grade}`, value: s.id })),
    [students]
  );

  const dayOptions = [
    { label: 'Senin', value: 'Senin' },
    { label: 'Selasa', value: 'Selasa' },
    { label: 'Rabu', value: 'Rabu' },
    { label: 'Kamis', value: 'Kamis' },
    { label: 'Jumat', value: 'Jumat' },
    { label: 'Sabtu', value: 'Sabtu' },
    { label: 'Minggu', value: 'Minggu' }
  ];

  const daysList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  // Group Schedules by Day
  const scheduleByDay = useMemo(() => {
    const grouped: Record<string, ScheduleItem[]> = {
      Senin: [], Selasa: [], Rabu: [], Kamis: [], Jumat: [], Sabtu: [], Minggu: []
    };
    schedules.forEach((sch) => {
      if (grouped[sch.day_of_week]) {
        grouped[sch.day_of_week].push(sch);
      }
    });

    // Chronologically sort entries inside each day by start_time ASC
    Object.keys(grouped).forEach((d) => {
      grouped[d].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
    });

    return grouped;
  }, [schedules]);

  const handleJadwalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jTeacherId || !jStudentId) {
      toast.error('Pilih Guru Pengajar dan Siswa Bimbingan terlebih dahulu!');
      return;
    }

    await createJadwalMutation.mutateAsync({
      teacher_id: jTeacherId,
      student_id: jStudentId,
      day_of_week: jDay,
      start_time: jStartTime,
      end_time: jEndTime,
      room: jRoom
    });

    setJTeacherId('');
    setJStudentId('');
    setIsFormOpen(false);
  };

  const handleStartEdit = (sch: ScheduleItem) => {
    setEditingJadwal(sch);
    setEditTeacherId(sch.teacher_id);
    setEditStudentId(sch.student_id);
    setEditDay(sch.day_of_week);
    setEditStartTime(sch.start_time);
    setEditEndTime(sch.end_time);
    setEditRoom(sch.room);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJadwal) return;

    await updateJadwalMutation.mutateAsync({
      id: editingJadwal.id,
      teacher_id: editTeacherId,
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
    await deleteJadwalMutation.mutateAsync(deleteTargetJadwal.id);
    setDeleteTargetJadwal(null);
  };

  if (isJadwalLoading || isGuruLoading || isSiswaLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  const filteredDays = activeDayFilter === 'Semua' ? daysList : [activeDayFilter];

  return (
    <div className="space-y-3">
      {/* Integrated Ultra-Efficient Header & Filter Toolbar */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2.5">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Jadwal Belajar Siswa & Guru
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Atur alokasi waktu bimbingan per hari, guru pendamping, dan ruangan kelas.
              </p>
            </div>
          </div>

          {can('create', 'jadwal') && (
            <Button variant="primary" size="sm" onClick={() => setIsFormOpen(!isFormOpen)} className="shadow-xs text-xs font-bold h-9 px-4 rounded-xl ml-auto">
              <Plus className="w-3.5 h-3.5 mr-1 text-amber-300" /> Tambah Jadwal
            </Button>
          )}
        </div>

        {/* Day Filter Pills Integrated Row */}
        <div className="overflow-x-auto scrollbar-none flex items-center gap-1.5 w-full">
          <button
            onClick={() => setActiveDayFilter('Semua')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeDayFilter === 'Semua'
                ? 'bg-emerald-600 text-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            Semua Hari ({schedules.length})
          </button>
          {daysList.map((day) => {
            const count = (scheduleByDay[day] || []).length;
            const isActive = activeDayFilter === day;
            return (
              <button
                key={day}
                onClick={() => setActiveDayFilter(day)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-amber-300 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {day} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. REUSABLE MODAL: TAMBAH SESI JADWAL BELAJAR */}
      <Modal
        isOpen={isFormOpen && can('create', 'jadwal')}
        onClose={() => setIsFormOpen(false)}
        title="Form Tambah Sesi Jadwal Belajar"
        icon={CalendarDays}
        maxWidth="lg"
      >
        <form onSubmit={handleJadwalSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Pilih Guru Pengajar:</Label>
              <Select
                options={teacherOptions}
                value={jTeacherId}
                onChange={(val) => setJTeacherId(val)}
                placeholder="-- Cari Guru Pengajar --"
                isSearchable
                isClearable
              />
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Pilih Siswa Bimbingan:</Label>
              <Select
                options={studentOptions}
                value={jStudentId}
                onChange={(val) => setJStudentId(val)}
                placeholder="-- Cari Siswa Bimbingan --"
                isSearchable
                isClearable
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Pilih Hari:</Label>
              <select
                value={jDay}
                onChange={(e) => setJDay(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Jam Mulai Sesi:</Label>
              <Input
                type="time"
                required
                value={jStartTime}
                onChange={(e) => setJStartTime(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Jam Selesai Sesi:</Label>
              <Input
                type="time"
                required
                value={jEndTime}
                onChange={(e) => setJEndTime(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={createJadwalMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
              {createJadwalMutation.isPending ? 'Menyimpan...' : 'Simpan Jadwal Sesi'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. REUSABLE MODAL: EDIT SESI JADWAL BELAJAR */}
      <Modal
        isOpen={!!editingJadwal}
        onClose={() => setEditingJadwal(null)}
        title="Edit Sesi Jadwal Belajar"
        icon={Edit3}
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Guru Pengajar:</Label>
              <Select
                options={teacherOptions}
                value={editTeacherId}
                onChange={(val) => setEditTeacherId(val)}
                placeholder="-- Cari Guru Pengajar --"
                isSearchable
                isClearable
              />
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Siswa Bimbingan:</Label>
              <Select
                options={studentOptions}
                value={editStudentId}
                onChange={(val) => setEditStudentId(val)}
                placeholder="-- Cari Siswa Bimbingan --"
                isSearchable
                isClearable
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Hari:</Label>
              <select
                value={editDay}
                onChange={(e) => setEditDay(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {dayOptions.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Jam Mulai:</Label>
              <Input
                type="time"
                required
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Jam Selesai:</Label>
              <Input
                type="time"
                required
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="h-9 text-xs font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setEditingJadwal(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={updateJadwalMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
              {updateJadwalMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. REUSABLE MODAL: KONFIRMASI HAPUS JADWAL */}
      <Modal
        isOpen={!!deleteTargetJadwal}
        onClose={() => setDeleteTargetJadwal(null)}
        title="Konfirmasi Hapus Jadwal"
        icon={AlertTriangle}
        maxWidth="sm"
      >
        {deleteTargetJadwal && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus jadwal sesi <strong>{deleteTargetJadwal.teacher_name}</strong> dengan siswa <strong>{deleteTargetJadwal.student_name}</strong> pada hari {deleteTargetJadwal.day_of_week}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetJadwal(null)} className="h-9 px-4 text-xs font-bold rounded-xl">
                Batal
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteJadwal} className="h-9 px-4 text-xs font-bold rounded-xl shadow-md">
                Ya, Hapus Jadwal
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* COMPACT RESPONSIVE SCHEDULE DAY GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredDays.map((day) => {
          const daySchedules = scheduleByDay[day] || [];

          return (
            <Card key={day} className="p-3 bg-white border border-slate-200 shadow-2xs space-y-2.5 rounded-2xl flex flex-col justify-between">
              {/* Day Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900 text-xs">{day}</h3>
                </div>
                <Badge variant={daySchedules.length > 0 ? 'emerald' : 'slate'} size="sm" className="text-[10px] py-0 px-2">
                  {daySchedules.length} Sesi
                </Badge>
              </div>

              {/* Day Schedule Items */}
              {daySchedules.length > 0 ? (
                <div className="space-y-2">
                  {daySchedules.map((sch) => (
                    <div
                      key={sch.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-emerald-300 hover:bg-emerald-50/20 transition space-y-1.5 group relative"
                    >
                      {/* Time Slot Badge & Actions */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                          <Clock className="w-3 h-3 text-emerald-600" />
                          <span>{sch.start_time} - {sch.end_time}</span>
                        </span>

                        {can('manage', 'jadwal') && (
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleStartEdit(sch)}
                              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-100 rounded-md transition cursor-pointer"
                              title="Edit Jadwal Sesi"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetJadwal(sch)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition cursor-pointer"
                              title="Hapus Jadwal Sesi"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Teacher Info (Mini Avatar xs) */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <Avatar src={sch.teacher_photo} name={sch.teacher_name} size="xs" className="w-6 h-6 shrink-0" />
                        <div className="truncate">
                          <span className="text-[10px] text-slate-500 font-medium block leading-none">Guru:</span>
                          <span className="text-xs font-bold text-slate-900 truncate block">{sch.teacher_name}</span>
                        </div>
                      </div>

                      {/* Student Info (Mini Avatar xs) */}
                      <div className="flex items-center gap-2 pt-0.5 border-t border-slate-200/50">
                        <Avatar name={sch.student_name} size="xs" className="w-6 h-6 shrink-0 ring-1 ring-amber-400" />
                        <div className="truncate">
                          <span className="text-[10px] text-slate-500 font-medium block leading-none">Siswa:</span>
                          <span className="text-xs font-bold text-slate-900 truncate block">{sch.student_name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400">
                  <p className="text-[11px] font-medium italic">Tidak ada jadwal.</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
