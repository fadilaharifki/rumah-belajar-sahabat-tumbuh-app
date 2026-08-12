'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, UserCheck, Calendar, FileText, Sparkles, Plus,
  ClipboardList, Hash, Clock, MessageCircle, Filter, RotateCcw,
  BookOpen, Award, CheckCircle2, ChevronDown, X, CalendarDays, Eye
} from 'lucide-react';
import { useSiswaDetailQuery } from '@/hooks/queries/useSiswaQueries';
import { useSubmitSessionLogMutation } from '@/hooks/queries/usePresensiQueries';
import { useGuruQuery } from '@/hooks/queries/useGuruQueries';
import { useAuthStore } from '@/stores/useAuthStore';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { Input } from '@/components/atoms/Input';
import { Label } from '@/components/atoms/Label';
import { DatePicker } from '@/components/atoms/DatePicker';
import { Modal } from '@/components/atoms/Modal';
import { Skeleton } from '@/components/atoms/Skeleton';
import { RichTextEditor } from '@/components/molecules/RichTextEditor';
import { formatWaUrl } from '@/utils/formatters';
import { format } from 'date-fns';

function formatRichContent(text?: string): string {
  if (!text) return '-';
  const hasHtml = /<[a-z][\s\S]*>/i.test(text);
  if (hasHtml) return text;
  return text.replace(/\n/g, '<br />');
}

export default function DetailSiswaPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const { user } = useAuthStore();

  // TanStack Queries
  const { data: detailData, isLoading } = useSiswaDetailQuery(studentId);
  const { data: teachers = [] } = useGuruQuery();
  const submitSessionLogMutation = useSubmitSessionLogMutation();

  const [activeTab, setActiveTab] = useState<'progress' | 'presensi' | 'jadwal'>('progress');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [selectedDetailLog, setSelectedDetailLog] = useState<any>(null);
  const [isDiagnosaModalOpen, setIsDiagnosaModalOpen] = useState(false);

  // Date Filtering State (Mode: 'all' | 'month' | 'range')
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'range'>('all');
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Form State for Adding New Session Note for this student
  const [teacherId, setTeacherId] = useState('');
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activity, setActivity] = useState('');
  const [recommendation, setRecommendation] = useState('');

  const student = detailData?.student;
  const rawLogs = detailData?.logs || [];
  const rawAttendance = detailData?.attendance || [];
  const studentSchedules = detailData?.schedules || [];

  // Filtered & Sorted Session Logs (Hasil Pembelajaran - Terbaru di paling atas)
  const studentLogs = useMemo(() => {
    const filtered = rawLogs.filter((log: any) => {
      const logDate = log.session_date;
      if (!logDate) return true;

      if (filterMode === 'month') {
        const monthKey = format(selectedMonthDate, 'yyyy-MM');
        return logDate.startsWith(monthKey);
      }
      if (filterMode === 'range') {
        if (startDate && logDate < startDate) return false;
        if (endDate && logDate > endDate) return false;
        return true;
      }
      return true;
    });

    return [...filtered].sort((a: any, b: any) => {
      const dateA = a.session_date || '';
      const dateB = b.session_date || '';
      if (dateA !== dateB) {
        return dateB.localeCompare(dateA);
      }
      return (b.session_number || 0) - (a.session_number || 0);
    });
  }, [rawLogs, filterMode, selectedMonthDate, startDate, endDate]);

  // Filtered & Sorted Attendance History (Terbaru di paling atas)
  const studentAttendance = useMemo(() => {
    const filtered = rawAttendance.filter((att: any) => {
      const attDate = att.date;
      if (!attDate) return true;

      if (filterMode === 'month') {
        const monthKey = format(selectedMonthDate, 'yyyy-MM');
        return attDate.startsWith(monthKey);
      }
      if (filterMode === 'range') {
        if (startDate && attDate < startDate) return false;
        if (endDate && attDate > endDate) return false;
        return true;
      }
      return true;
    });

    return [...filtered].sort((a: any, b: any) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
  }, [rawAttendance, filterMode, selectedMonthDate, startDate, endDate]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    const selectedTeacherId = teacherId || teachers[0]?.id;
    if (!selectedTeacherId) return;

    await submitSessionLogMutation.mutateAsync({
      student_id: student.id,
      teacher_id: selectedTeacherId,
      session_number: Number(sessionNumber) || (rawLogs.length + 1),
      activities: activity,
      results_recommendations: recommendation,
      session_date: date
    });

    setActivity('');
    setRecommendation('');
    setIsFormOpen(false);
  };

  const handleOpenForm = () => {
    setTeacherId(teachers[0]?.id || '');
    setSessionNumber(rawLogs.length + 1);
    setIsFormOpen(true);
  };

  const resetDateFilters = () => {
    setFilterMode('all');
    setStartDate('');
    setEndDate('');
    setSelectedMonthDate(new Date());
    setShowFilterPicker(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Siswa Tidak Ditemukan</h2>
        <Button variant="outline" onClick={() => router.push('/data-siswa')}>
          Kembali ke Daftar Siswa
        </Button>
      </div>
    );
  }

  const canAddResult = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'teacher';

  return (
    <div className="space-y-3.5 max-w-5xl mx-auto px-1 sm:px-0">
      {/* UNIFIED SINGLE-CARD STUDENT PROFILE HEADER & TOOLBAR CONTAINER */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-2.5 sm:p-3.5 space-y-2 sm:space-y-3">
        {/* ROW 1: STUDENT PROFILE HEADER + ACTION BUTTON (+ HASIL BELAJAR) */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 sm:pb-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => router.push('/data-siswa')}
              className="p-1 sm:p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shrink-0"
              title="Kembali ke Daftar Siswa"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <Avatar src={student.avatar_url} name={student.name} size="sm" className="ring-2 ring-emerald-500/30 shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">{student.name}</h1>
                <Badge variant="amber" size="sm" className="text-[9px] sm:text-[10px] py-0 px-1.5">{student.grade}</Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-500 font-medium truncate mt-0.5">
                <span className="truncate">Wali: <strong className="text-slate-800">{student.parent_name}</strong></span>
                {student.parent_phone && student.parent_phone !== '-' && (
                  <a
                    href={formatWaUrl(student.parent_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 font-mono font-bold hover:text-emerald-900 transition shrink-0"
                    title="WhatsApp Wali"
                  >
                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                    <span className="hidden sm:inline">{student.parent_phone}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: Diagnosa Awal & Input Hasil Belajar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiagnosaModalOpen(true)}
              className="shadow-2xs text-xs font-bold h-8 sm:h-9 px-2 sm:px-3 rounded-xl border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100 transition cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 sm:mr-1 text-amber-600" />
              <span className="hidden sm:inline">Diagnosa Awal</span>
              <span className="sm:hidden text-[11px]">Diagnosa</span>
            </Button>

            {canAddResult && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenForm}
                className="shadow-xs text-xs font-bold h-8 sm:h-9 px-2.5 sm:px-4 rounded-xl shrink-0"
              >
                <Plus className="w-3.5 h-3.5 sm:mr-1 text-amber-300" />
                <span className="hidden sm:inline">Hasil Belajar</span>
                <span className="sm:hidden text-[11px]">Hasil</span>
              </Button>
            )}
          </div>
        </div>

        {/* ROW 2: TABS (LEFT) + COMPACT DATE FILTER (RIGHT) */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {/* HORIZONTALLY SCROLLABLE TABS */}
          <div className="overflow-x-auto scrollbar-none flex items-center gap-1 min-w-0 flex-1">
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'progress'
                ? 'bg-emerald-600 text-amber-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>Progress ({studentLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('presensi')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'presensi'
                ? 'bg-emerald-600 text-amber-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <ClipboardList className="w-3 h-3" />
              <span>Presensi ({studentAttendance.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('jadwal')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${activeTab === 'jadwal'
                ? 'bg-emerald-600 text-amber-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Jadwal ({studentSchedules.length})</span>
            </button>
          </div>

          {/* DATE FILTER BUTTON ON THE RIGHT */}
          <div className="relative shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFilterPicker(!showFilterPicker)}
                className={`flex items-center gap-1 h-8 sm:h-9 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer border shadow-2xs ${filterMode !== 'all'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/20'
                  : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
              >
                <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">
                  {filterMode === 'all'
                    ? 'Filter Tanggal'
                    : filterMode === 'month'
                      ? `Bulan: ${format(selectedMonthDate, 'MMM yyyy')}`
                      : `${startDate || 'Mulai'} - ${endDate || 'Selesai'}`}
                </span>
                <span className="sm:hidden text-[10px]">Filter</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showFilterPicker ? 'rotate-180' : ''}`} />
              </button>

              {filterMode !== 'all' && (
                <button
                  onClick={resetDateFilters}
                  className="p-1 sm:p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  title="Reset Filter Tanggal"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Precision Filter Dropdown Modal Popover */}
            {showFilterPicker && (
              <div className="absolute top-full right-0 mt-2 z-30 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CalendarDays className="w-4 h-4 text-emerald-600" />
                    <span>Presisi Filter Tanggal</span>
                  </div>
                  <button onClick={() => setShowFilterPicker(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mode Switch Pills */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`py-1.5 rounded-lg text-center transition ${filterMode === 'all' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setFilterMode('month')}
                    className={`py-1.5 rounded-lg text-center transition ${filterMode === 'month' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Per Bulan
                  </button>
                  <button
                    onClick={() => setFilterMode('range')}
                    className={`py-1.5 rounded-lg text-center transition ${filterMode === 'range' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Rentang
                  </button>
                </div>

                {/* View 1: Month Picker */}
                {filterMode === 'month' && (
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[10px]">Pilih Bulan & Tahun:</Label>
                    <DatePicker
                      mode="month"
                      value={selectedMonthDate}
                      onChange={(d) => {
                        setSelectedMonthDate(d);
                        setShowFilterPicker(false);
                      }}
                      className="w-full text-xs"
                    />
                  </div>
                )}

                {/* View 2: Custom Date Range */}
                {filterMode === 'range' && (
                  <div className="space-y-2 pt-1 text-xs">
                    <div>
                      <Label className="text-[10px]">Tanggal Mulai:</Label>
                      <DatePicker
                        mode="date"
                        value={startDate}
                        onChange={(d) => setStartDate(format(d, 'yyyy-MM-dd'))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Tanggal Akhir:</Label>
                      <DatePicker
                        mode="date"
                        value={endDate}
                        onChange={(d) => setEndDate(format(d, 'yyyy-MM-dd'))}
                        className="w-full"
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowFilterPicker(false)}
                      className="w-full justify-center text-xs font-bold mt-1"
                    >
                      Terapkan Rentang Tanggal
                    </Button>
                  </div>
                )}

                {/* Reset Action */}
                {filterMode !== 'all' && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={resetDateFilters}
                      className="text-[11px] font-bold text-emerald-700 hover:underline"
                    >
                      Reset ke Semua Tanggal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. REUSABLE RESPONSIVE MODAL & BOTTOM SHEET: INPUT CATATAN HASIL BELAJAR */}
      <Modal
        isOpen={isFormOpen && canAddResult}
        onClose={() => setIsFormOpen(false)}
        title="Input Hasil Pembelajaran"
        subtitle={`${student.name} • ${student.grade}`}
        icon={FileText}
        maxWidth="xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Pertemuan Ke-:</Label>
              <div className="relative">
                <Input
                  required
                  type="number"
                  min={1}
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(Number(e.target.value))}
                  className="font-bold text-emerald-800 text-xs pl-9 h-9"
                />
                <Hash className="w-3.5 h-3.5 text-emerald-600 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Tanggal Sesi:</Label>
              <DatePicker
                mode="date"
                value={date}
                onChange={(d) => setDate(format(d, 'yyyy-MM-dd'))}
                placeholder="Pilih Tanggal Sesi"
                className="w-full text-xs h-9"
              />
            </div>

            <div>
              <Label required className="text-xs font-bold text-slate-700 mb-1">Pengajar / Guru:</Label>
              <select
                required
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label required className="text-xs font-bold text-slate-700 mb-1">Materi & Kegiatan Belajar:</Label>
            <RichTextEditor
              value={activity}
              onChange={setActivity}
              placeholder="Contoh: Belajar Perkalian 1-10, membaca cerita pendek..."
              minHeight="100px"
            />
          </div>

          <div>
            <Label required className="text-xs font-bold text-slate-700 mb-1">Evaluasi / Hasil Belajar:</Label>
            <RichTextEditor
              value={recommendation}
              onChange={setRecommendation}
              placeholder="Contoh: Ananda Bintang antusias, perkalian 5 sudah lancar..."
              minHeight="100px"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)} className="h-9 px-4 text-xs font-bold rounded-xl">
              Batal
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={submitSessionLogMutation.isPending} className="h-9 px-5 text-xs font-bold rounded-xl shadow-md">
              {submitSessionLogMutation.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. PRIMARY CONTENT AREA: FOCUS ON HASIL PEMBELAJARAN (NEWEST FIRST AT TOP) */}
      {activeTab === 'progress' && (
        <div className="space-y-3">
          {studentLogs.length > 0 ? (
            studentLogs.map((log: any) => (
              <Card key={log.id} className="p-3.5 sm:p-4 space-y-2.5 bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition rounded-2xl">
                {/* Session Timeline Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={log.teacher_photo} name={log.teacher_name} size="sm" className="ring-2 ring-emerald-500/30 shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate max-w-[180px] sm:max-w-xs" title={log.teacher_name}>
                        {log.teacher_name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">Pengajar Pendamping</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="emerald" size="sm" className="font-extrabold text-[10px]">
                      <Hash className="w-3 h-3 mr-0.5" />
                      <span>Ke-{log.session_number || 1}</span>
                    </Badge>
                    <Badge variant="slate" size="sm" className="text-[10px] font-bold">
                      <Calendar className="w-3 h-3 mr-1 text-emerald-600" />
                      <span>{log.session_date}</span>
                    </Badge>
                    <Badge variant="slate" size="sm" className="text-[10px]">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{log.start_time} - {log.end_time}</span>
                    </Badge>
                  </div>
                </div>

                {/* Compact Preview Row & Action Button */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {/* Left Preview: Materi Belajar */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-0.5">
                    <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] text-slate-500">
                      <BookOpen className="w-3 h-3 text-emerald-600" />
                      <span>Materi & Aktivitas Belajar:</span>
                    </div>
                    <div
                      className="rich-text-content text-slate-800 font-normal text-xs line-clamp-1"
                      dangerouslySetInnerHTML={{ __html: formatRichContent(log.activities) }}
                    />
                  </div>

                  {/* Right Preview: Evaluasi */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-0.5">
                    <div className="flex items-center gap-1 font-bold uppercase tracking-wider text-[10px] text-emerald-900">
                      <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
                      <span>Evaluasi :</span>
                    </div>
                    <div
                      className="rich-text-content text-emerald-950 font-normal text-xs line-clamp-1 italic"
                      dangerouslySetInnerHTML={{ __html: formatRichContent(log.results_recommendations) }}
                    />
                  </div>
                </div>

                {/* Open Modal Detail Action Button */}
                <div className="pt-1 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDetailLog(log)}
                    className="h-8 text-xs font-bold px-3 rounded-xl border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>Lihat Detail Catatan Pembelajaran</span>
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-10 text-center text-slate-400 space-y-2 rounded-2xl">
              <Award className="w-8 h-8 text-emerald-600 mx-auto opacity-40" />
              <p className="font-semibold text-xs text-slate-700">Belum ada catatan hasil pembelajaran untuk {student.name} pada filter ini.</p>
              {filterMode !== 'all' && (
                <button onClick={resetDateFilters} className="text-xs text-emerald-700 font-bold underline cursor-pointer">
                  Tampilkan Semua Periode
                </button>
              )}
            </Card>
          )}
        </div>
      )}

      {/* DETAIL CATATAN PEMBELAJARAN MODAL */}
      <Modal
        isOpen={Boolean(selectedDetailLog)}
        onClose={() => setSelectedDetailLog(null)}
        title="Detail Catatan Pembelajaran Sesi"
        icon={FileText}
        maxWidth="lg"
      >
        {selectedDetailLog && (
          <div className="space-y-4">
            {/* Header Information Box */}
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Guru Pengajar</span>
                  <p className="font-bold text-slate-900 truncate" title={selectedDetailLog.teacher_name}>
                    {selectedDetailLog.teacher_name}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Siswa Bimbingan</span>
                  <p className="font-bold text-slate-900 truncate" title={student.name}>
                    {student.name} <span className="text-amber-800 text-[11px] font-bold">({student.grade})</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/80 font-mono text-[11px] text-emerald-950">
                <span className="font-extrabold bg-emerald-200/80 text-emerald-950 px-2 py-0.5 rounded-md">
                  Pertemuan ke-{selectedDetailLog.session_number || 1}
                </span>
                <span>Tanggal: {selectedDetailLog.session_date}</span>
                <span>Jam: {selectedDetailLog.start_time} - {selectedDetailLog.end_time} WIB</span>
              </div>
            </div>

            {/* 2-Column Full Content Details */}
            <div className="space-y-3.5">
              {/* Materi & Aktivitas Belajar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-slate-700 border-b border-slate-200/80 pb-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Materi & Aktivitas Belajar:</span>
                </div>
                <div
                  className="rich-text-content text-slate-800 font-normal text-xs sm:text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatRichContent(selectedDetailLog.activities) }}
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
                  dangerouslySetInnerHTML={{ __html: formatRichContent(selectedDetailLog.results_recommendations) }}
                />
              </div>
            </div>

            {/* Footer Modal Action */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDetailLog(null)}
                className="h-9 text-xs font-bold px-4 rounded-xl"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DIAGNOSA AWAL & CATATAN KEBUTUHAN SISWA MODAL */}
      <Modal
        isOpen={isDiagnosaModalOpen}
        onClose={() => setIsDiagnosaModalOpen(false)}
        title="Diagnosa Awal & Catatan Kebutuhan Siswa"
        icon={ClipboardList}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="bg-amber-50/90 p-3 rounded-2xl border border-amber-200/90 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-amber-950 font-bold text-xs sm:text-sm">{student.name}</p>
              <p className="text-amber-800 text-[11px] font-medium">{student.grade} • Wali: {student.parent_name}</p>
            </div>
            {student.parent_phone && student.parent_phone !== '-' && (
              <a
                href={formatWaUrl(student.parent_phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-800 font-mono text-[11px] font-bold flex items-center gap-1 hover:underline"
              >
                <MessageCircle className="w-3 h-3 text-emerald-600" />
                <span>{student.parent_phone}</span>
              </a>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-amber-100/40 border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs text-amber-950 border-b border-amber-200/80 pb-2">
              <ClipboardList className="w-4 h-4 text-amber-600" />
              <span>Hasil Diagnosa / Catatan Kebutuhan Belajar:</span>
            </div>
            {student.notes ? (
              <div
                className="rich-text-content text-slate-800 font-normal text-xs sm:text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatRichContent(student.notes) }}
              />
            ) : (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                Belum ada catatan hasil diagnosa awal khusus untuk siswa ini.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiagnosaModalOpen(false)}
              className="h-9 text-xs font-bold px-4 rounded-xl"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* TAB 2: RIWAYAT PRESENSI SISWA */}
      {activeTab === 'presensi' && (
        <Card className="p-0 overflow-hidden bg-white shadow-2xs border border-slate-200 rounded-2xl">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>Riwayat Kehadiran Sesi Mengajar — {student.name}</span>
            <span className="text-emerald-700 font-mono text-[11px]">{studentAttendance.length} Presensi</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Guru Pengajar</th>
                  <th className="px-4 py-3">Jam Check-In</th>
                  <th className="px-4 py-3">Durasi</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentAttendance.length > 0 ? (
                  studentAttendance.map((att: any) => (
                    <tr key={att.id} className="hover:bg-emerald-50/20 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{att.date}</td>
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar src={att.teacher_photo} name={att.teacher_name} size="xs" className="shrink-0" />
                          <span className="font-bold text-slate-900 truncate" title={att.teacher_name}>{att.teacher_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">{att.check_in}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{att.duration_minutes}m</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{att.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                      Belum ada rekaman presensi untuk {student.name} pada filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: JADWAL SESI MINGGUAN SISWA */}
      {activeTab === 'jadwal' && (
        <Card className="p-0 overflow-hidden bg-white shadow-2xs border border-slate-200 rounded-2xl">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50 font-bold text-xs text-slate-700 flex items-center justify-between">
            <span>Jadwal Sesi Belajar Rutin — {student.name}</span>
            <span className="text-emerald-700 font-mono text-[11px]">{studentSchedules.length} Sesi Rutin</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <th className="px-4 py-3">Hari</th>
                  <th className="px-4 py-3">Jam Sesi</th>
                  <th className="px-4 py-3">Guru Pengajar</th>
                  <th className="px-4 py-3">Ruangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentSchedules.length > 0 ? (
                  studentSchedules.map((sch: any) => (
                    <tr key={sch.id} className="hover:bg-emerald-50/20 transition">
                      <td className="px-4 py-3 font-bold text-slate-900">{sch.day_of_week}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">
                        {sch.start_time} - {sch.end_time}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={sch.teacher_photo} name={sch.teacher_name} size="xs" />
                          <span className="font-bold text-slate-900">{sch.teacher_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{sch.room}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400 text-xs">
                      Belum ada jadwal ngajar rutin untuk {student.name}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
