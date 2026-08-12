'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator, Download, CheckCircle2, ChevronRight, Eye, ShieldCheck,
  MessageCircle, AlertTriangle, AlertCircle, BookOpenCheck, Clock, User
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useGuruQuery, useGuruDetailQuery } from '@/hooks/queries/useGuruQueries';
import { usePresensiQuery } from '@/hooks/queries/usePresensiQueries';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { Avatar } from '@/components/atoms/Avatar';
import { Badge } from '@/components/atoms/Badge';
import { DatePicker } from '@/components/atoms/DatePicker';
import { SkeletonTable } from '@/components/atoms/Skeleton';
import { formatRupiah, formatWaUrl } from '@/utils/formatters';
import { format } from 'date-fns';

export default function PenggajianPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const selectedMonth = format(selectedDate, 'yyyy-MM');
  const monthLabel = format(selectedDate, 'MMMM yyyy');

  const isTeacher = user?.role === 'teacher';

  // TanStack Queries
  const { data: allTeachers = [], isLoading: isLoadingGuru } = useGuruQuery();
  const { data: presensiList = [], isLoading: isLoadingPresensi } = usePresensiQuery();

  // Find matching teacher profile if logged-in user is a teacher
  const loggedInTeacher = useMemo(() => {
    return allTeachers.find((t) => t.email?.toLowerCase() === user?.email?.toLowerCase()) || allTeachers[0];
  }, [allTeachers, user]);

  // Fetch teacher's real-time personal detail from API
  const { data: teacherDetail, isLoading: isLoadingTeacherDetail } = useGuruDetailQuery(
    isTeacher && loggedInTeacher?.id ? loggedInTeacher.id : '',
    selectedMonth
  );

  const teacherPayroll = teacherDetail?.payroll;
  const teacherAttendance = teacherDetail?.attendance || [];
  const teacherSessionRate = loggedInTeacher?.session_rate || 85000;
  const teacherTotalSessions = teacherAttendance.length;
  const teacherTotalPayroll = teacherPayroll?.total_amount || teacherTotalSessions * teacherSessionRate;
  const teacherPayrollStatus = teacherPayroll?.status || 'Draft';

  // Role-Based Scoping Filter for Admin view
  const payrollData = useMemo(() => {
    return allTeachers.map((teacher) => {
      const validSessions = presensiList.filter(
        (p) =>
          p.teacher_id === teacher.id &&
          p.date.startsWith(selectedMonth) &&
          (p.status === 'Valid' || p.status === 'ManualVerified' || Boolean(p.session_log))
      );

      const totalSessions = validSessions.length;
      const rate = teacher.session_rate || 85000;
      const totalPay = totalSessions * rate;

      return {
        ...teacher,
        total_sessions: totalSessions,
        total_pay: totalPay,
        is_paid: totalSessions > 0
      };
    });
  }, [allTeachers, presensiList, selectedMonth]);

  const totalBudget = useMemo(() => {
    return payrollData.reduce((acc, curr) => acc + curr.total_pay, 0);
  }, [payrollData]);

  const totalSessionsAll = useMemo(() => {
    return payrollData.reduce((acc, curr) => acc + curr.total_sessions, 0);
  }, [payrollData]);

  const isLoading = isLoadingGuru || isLoadingPresensi;

  if (user?.role === 'parent') {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Akses Tidak Diizinkan</h2>
        <p className="text-xs text-slate-500">
          Menu Penggajian hanya dapat diakses oleh Manajemen, Staff, dan Guru Pengajar.
        </p>
        <Button variant="outline" onClick={() => router.push('/jadwal')}>
          Kembali ke Jadwal Belajar
        </Button>
      </div>
    );
  }

  // ==========================================
  // VIEW 1: SCREEN KHUSUS GURU PENGAJAR
  // ==========================================
  if (isTeacher) {
    return (
      <div className="space-y-3.5 pb-24 sm:pb-8">
        {/* Sleek Compact Header Bar Khusus Guru */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Rekap Honor Saya — {monthLabel}
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Honorarium otomatis berdasarkan sesi mengajar ({user?.full_name || loggedInTeacher?.name}).
              </p>
            </div>
          </div>

          <div className="w-full sm:w-48 ml-auto shrink-0">
            <DatePicker
              mode="month"
              value={selectedDate}
              onChange={(d) => setSelectedDate(d)}
              placeholder="Pilih Bulan Rekap"
            />
          </div>
        </div>

        {/* Card Status Pelunasan Transfer DB */}
        <Card className="p-4 sm:p-5 bg-white border border-amber-200 shadow-xs space-y-3 rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar src={loggedInTeacher?.photo_url} name={user?.full_name || 'Guru'} size="lg" className="ring-2 ring-emerald-500 shadow-xs shrink-0" />
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{user?.full_name || loggedInTeacher?.name}</h3>
                <p className="text-xs text-slate-500 font-mono truncate">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <span className="text-xs font-semibold text-slate-500">Status Pencairan DB:</span>
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-extrabold text-xs border ${
                teacherPayrollStatus === 'Lunas'
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300'
                  : teacherPayrollStatus === 'Pending'
                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}>
                {teacherPayrollStatus === 'Lunas' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>{teacherPayrollStatus.toUpperCase()}</span>
              </span>
            </div>
          </div>
        </Card>

        {/* 3 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card variant="emerald" className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Sesi Mengajar ({monthLabel})
            </span>
            <div className="text-xl sm:text-2xl font-bold text-emerald-950 font-mono">
              {teacherTotalSessions} Sesi
            </div>
          </Card>

          <Card variant="default" className="p-4 sm:p-5 space-y-1 bg-white border border-slate-200">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Tarif Honor Per Sesi
            </span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
              {formatRupiah(teacherSessionRate)}
            </div>
          </Card>

          <Card variant="amber" className="p-4 sm:p-5 space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900">
              Total Honor Saya ({monthLabel})
            </span>
            <div className="text-xl sm:text-2xl font-bold text-amber-950 font-mono">
              {formatRupiah(teacherTotalPayroll)}
            </div>
          </Card>
        </div>

        {/* Tabel Detail Rincian Presensi Sesi Guru */}
        {isLoadingTeacherDetail ? (
          <SkeletonTable rows={4} />
        ) : (
          <Card className="p-0 overflow-hidden bg-white shadow-sm border border-slate-200">
            <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-xs text-slate-700">
              <span className="flex items-center gap-1.5 truncate">
                <BookOpenCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">Rincian Presensi Sesi Mengajar Saya — {monthLabel}</span>
              </span>
              <span className="text-emerald-700 font-mono text-[11px] sm:text-xs shrink-0">{teacherTotalSessions} Sesi Valid</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-medium">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                    <th className="px-4 sm:px-5 py-3.5">ID Sesi</th>
                    <th className="px-4 sm:px-5 py-3.5">Tanggal</th>
                    <th className="px-4 sm:px-5 py-3.5">Siswa Bimbingan</th>
                    <th className="px-4 sm:px-5 py-3.5">Jam Masuk - Keluar</th>
                    <th className="px-4 sm:px-5 py-3.5 text-center">Durasi</th>
                    <th className="px-4 sm:px-5 py-3.5 text-right">Honor Per Sesi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherAttendance.length > 0 ? (
                    teacherAttendance.map((att: any, idx: number) => (
                      <tr key={att.id || idx} className="hover:bg-amber-50/20 transition">
                        <td className="px-4 sm:px-5 py-3.5 font-mono text-slate-400">#S-{idx + 101}</td>
                        <td className="px-4 sm:px-5 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">{att.date}</td>
                        <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">{att.student_name}</td>
                        <td className="px-4 sm:px-5 py-3.5 font-mono text-emerald-800">
                          {att.check_in} - {att.check_out || '15:00'}
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-center font-mono font-bold text-slate-800">
                          {att.duration_minutes || 60}m
                        </td>
                        <td className="px-4 sm:px-5 py-3.5 text-right font-mono font-bold text-emerald-800">
                          {formatRupiah(teacherSessionRate)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        Belum ada rincian presensi mengajar pada bulan {monthLabel}.
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

  // ==========================================
  // VIEW 2: SCREEN KHUSUS ADMIN / PEMILIK / STAFF
  // ==========================================
  return (
    <div className="space-y-3.5 pb-24 sm:pb-8">
      {/* Sleek Compact Header Bar Admin */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Penggajian Seluruh Guru — {monthLabel}
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Perhitungan honorarium otomatis berdasarkan akumulasi sesi mengajar terverifikasi.
            </p>
          </div>
        </div>

        <div className="w-full sm:w-48 ml-auto shrink-0">
          <DatePicker
            mode="month"
            value={selectedDate}
            onChange={(d) => setSelectedDate(d)}
            placeholder="Pilih Bulan Rekap"
          />
        </div>
      </div>

      {/* Summary Stat Cards Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card variant="emerald" className="p-4 sm:p-5 space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">
            Total Anggaran Honor Guru ({monthLabel})
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-950 font-mono">
            {formatRupiah(totalBudget)}
          </div>
        </Card>

        <Card variant="amber" className="p-4 sm:p-5 space-y-1">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900">
            Total Sesi Valid Selesai
          </span>
          <div className="text-xl sm:text-2xl font-bold text-amber-950 font-mono">
            {totalSessionsAll} Sesi Mengajar
          </div>
        </Card>

        <Card variant="default" className="p-4 sm:p-5 space-y-1 bg-white border border-slate-200">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
            Rata-rata Tarif Per Sesi
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">
            {formatRupiah(payrollData[0]?.session_rate || 85000)}
          </div>
        </Card>
      </div>

      {/* Payroll Table Admin */}
      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : (
        <Card className="p-0 overflow-hidden bg-white shadow-sm border border-slate-200">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between font-bold text-xs text-slate-700">
            <span>Rincian Honorarium Seluruh Pengajar</span>
            <span className="text-emerald-700 font-mono font-bold text-xs">Periode: {monthLabel}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-medium">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-slate-200">
                  <th className="px-3.5 py-2.5">Nama Pengajar</th>
                  <th className="px-3.5 py-2.5">Kontak WhatsApp</th>
                  <th className="px-3.5 py-2.5">Tarif / Sesi</th>
                  <th className="px-3.5 py-2.5 text-center">Sesi Valid ({monthLabel})</th>
                  <th className="px-3.5 py-2.5">Total Honor Terakumulasi</th>
                  <th className="px-3.5 py-2.5 text-right">Detail & Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payrollData.length > 0 ? (
                  payrollData.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => router.push(`/data-guru/${item.id}`)}
                      className="hover:bg-amber-50/20 cursor-pointer transition group"
                    >
                      <td className="px-3.5 py-2.5 max-w-[200px]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar src={item.photo_url || item.avatar_url} name={item.name} size="sm" className="shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-xs group-hover:text-emerald-700 transition truncate" title={item.name}>{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate" title={item.email}>{item.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <a
                          href={formatWaUrl(item.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-emerald-700 hover:text-emerald-900 text-xs flex items-center gap-1.5 transition font-mono"
                          onClick={(e) => e.stopPropagation()}
                          title="Chat langsung via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="underline decoration-emerald-300 underline-offset-2">{item.phone}</span>
                        </a>
                      </td>

                      <td className="px-3.5 py-2.5 font-mono font-semibold text-slate-700">
                        {formatRupiah(item.session_rate)}
                      </td>

                      <td className="px-3.5 py-2.5 text-center">
                        <Badge variant="emerald" size="sm">
                          {item.total_sessions} Sesi
                        </Badge>
                      </td>

                      <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-800 text-xs">
                        {formatRupiah(item.total_pay)}
                      </td>

                      <td className="px-3.5 py-2.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/data-guru/${item.id}`);
                          }}
                          className="text-xs group-hover:bg-emerald-600 group-hover:text-white transition"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Rincian Sesi <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      Belum ada data pengajar.
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
