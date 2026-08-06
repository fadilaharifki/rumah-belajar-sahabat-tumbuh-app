'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  GraduationCap, 
  HeartHandshake, 
  BookOpenCheck, 
  Calculator, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Sprout,
  CalendarDays,
  UserCog,
  Settings,
  Grid,
  UserCheck
} from 'lucide-react';
import { useMasterData } from '@/hooks/useMasterData';
import { usePresensiQuery } from '@/hooks/queries/usePresensiQueries';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAbility } from '@/hooks/useAbility';
import { Card } from '@/components/atoms/Card';
import { Badge } from '@/components/atoms/Badge';
import { formatRupiah } from '@/utils/formatters';
import { format } from 'date-fns';

export default function DashboardPage() {
  const { teachers, students, staff } = useMasterData();
  const { data: presensiList = [] } = usePresensiQuery();
  const { activeRole, user } = useAuthStore();
  const { can, currentRole } = useAbility();

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthLabel = format(new Date(), 'MMMM yyyy');

  const isTeacher = user?.role === 'teacher';

  // Find matching teacher ID if logged in as a teacher
  const loggedInTeacher = useMemo(() => {
    if (!isTeacher) return null;
    return (
      teachers.find((t) => t.id === user?.teacher_id) ||
      teachers.find((t) => t.email?.toLowerCase() === user?.email?.toLowerCase()) ||
      null
    );
  }, [isTeacher, teachers, user]);

  const teacherId = loggedInTeacher?.id;

  const totalTeachers = teachers.length;
  const totalStudents = students.length;
  const totalStaff = staff.length;

  // Filter ONLY valid / verified / logged sessions for current month (Scoped to Teacher if logged in as Teacher)
  const monthAttendance = useMemo(() => {
    return presensiList.filter((p) => {
      const isCurrentMonth = p.date?.startsWith(currentMonth);
      const isValidSession = p.status === 'Valid' || p.status === 'ManualVerified' || Boolean(p.session_log);
      
      if (!isCurrentMonth || !isValidSession) return false;
      if (isTeacher && teacherId) return p.teacher_id === teacherId;
      return true;
    });
  }, [presensiList, currentMonth, isTeacher, teacherId]);

  const totalSessionsMonth = monthAttendance.length;
  const totalHoursMonth = (totalSessionsMonth * 1.0).toFixed(0);

  // Sum actual payroll: Teacher sees personal earnings, Admin sees total institution earnings
  const totalPayrollReal = useMemo(() => {
    if (isTeacher && loggedInTeacher) {
      const rate = loggedInTeacher.session_rate || 85000;
      return totalSessionsMonth * rate;
    }

    return teachers.reduce((acc, teacher) => {
      const validSessions = presensiList.filter(
        (p) =>
          p.teacher_id === teacher.id &&
          p.date?.startsWith(currentMonth) &&
          (p.status === 'Valid' || p.status === 'ManualVerified' || Boolean(p.session_log))
      );
      const rate = teacher.session_rate || 85000;
      return acc + (validSessions.length * rate);
    }, 0);
  }, [teachers, presensiList, currentMonth, isTeacher, loggedInTeacher, totalSessionsMonth]);

  // Clean, permission-filtered mobile quick links
  const mobileQuickLinks = [
    { name: 'Siswa', href: '/data-siswa', icon: GraduationCap, color: 'bg-amber-100 text-amber-900 border-amber-200', isVisible: can('read', 'siswa') },
    { name: 'Jadwal', href: '/jadwal', icon: CalendarDays, color: 'bg-emerald-100 text-emerald-900 border-emerald-200', isVisible: can('read', 'jadwal') },
    { name: 'Guru', href: '/data-guru', icon: Users, color: 'bg-teal-100 text-teal-900 border-teal-200', isVisible: can('read', 'guru') },
    { name: 'Wali', href: '/data-wali', icon: HeartHandshake, color: 'bg-blue-100 text-blue-900 border-blue-200', isVisible: can('read', 'wali') },
    { name: 'Staff', href: '/data-staff', icon: UserCheck, color: 'bg-indigo-100 text-indigo-900 border-indigo-200', isVisible: can('read', 'staff') },
    { name: 'Pengguna', href: '/data-pengguna', icon: UserCog, color: 'bg-purple-100 text-purple-900 border-purple-200', isVisible: can('manage', 'roles') },
    { name: 'Payroll', href: '/penggajian', icon: Calculator, color: 'bg-rose-100 text-rose-900 border-rose-200', isVisible: can('read', 'penggajian') },
    { name: 'Akun', href: '/pengaturan', icon: Settings, color: 'bg-slate-100 text-slate-900 border-slate-200', isVisible: true },
  ].filter((item) => item.isVisible);

  const displayRoleName = currentRole?.name || (activeRole === 'admin' ? 'Pemilik / Admin Utama' : activeRole === 'teacher' ? 'Pengajar / Guru' : 'Wali Siswa');

  return (
    <div className="space-y-3.5">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-4 sm:p-5 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-15 pointer-events-none">
          <Sprout className="w-80 h-80 text-amber-300" />
        </div>

        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Rumah Belajar Sahabat Tumbuh</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
            Selamat Datang, {user?.full_name || 'Pengguna'}! 👋
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-medium">
            Sistem informasi operasional & pendampingan belajar anak. Pantau progress belajar, presensi foto kamera, dan rekap honor pengajar secara real-time.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            <Badge variant="amber" size="md">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Multi-Role & Permission Active
            </Badge>
            <div className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-400/30 backdrop-blur-xs text-xs font-semibold text-emerald-100 flex items-center gap-1.5">
              <span>Peran:</span>
              <strong className="text-amber-300 font-bold">{displayRoleName}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE QUICK LAUNCHER GRID - FILTERED BY PERMISSION */}
      {mobileQuickLinks.length > 0 && (
        <div className="lg:hidden bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-semibold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Grid className="w-4 h-4 text-emerald-600" />
              <span>Menu Pintasan Aplikasi</span>
            </h3>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-1">
            {mobileQuickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-slate-50 transition text-center space-y-1.5 group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-2xl border ${item.color} flex items-center justify-center shadow-xs group-hover:scale-105 transition transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 truncate w-full text-center tracking-tight">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Core Count Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {can('read', 'siswa') && (
          <Card variant="emerald" className="p-4 sm:p-6 space-y-2 sm:space-y-3 hover:scale-[1.01] transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Siswa Aktif
              </span>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-emerald-100 text-emerald-700">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-emerald-950 font-mono">
              {totalStudents} <span className="text-xs font-normal">Anak</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" /> Aktif Bimbingan
            </p>
          </Card>
        )}

        {can('read', 'guru') && (
          <Card variant="amber" className="p-4 sm:p-6 space-y-2 sm:space-y-3 hover:scale-[1.01] transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-900">
                Pengajar
              </span>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-100 text-amber-800">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-amber-950 font-mono">
              {totalTeachers} <span className="text-xs font-normal">Guru</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-amber-800 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-amber-600" /> 100% Terdaftar
            </p>
          </Card>
        )}

        {can('read', 'staff') && (
          <Card variant="default" className="p-4 sm:p-6 space-y-2 sm:space-y-3 bg-white border border-slate-200 hover:scale-[1.01] transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                Staff Management
              </span>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-slate-900 font-mono">
              {totalStaff || 2} <span className="text-xs font-normal">Pengelola</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              Administrasi & Keuangan
            </p>
          </Card>
        )}

        {can('read', 'jadwal') && (
          <Card variant="default" className="p-4 sm:p-6 space-y-2 sm:space-y-3 bg-white border border-slate-200 hover:scale-[1.01] transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                {isTeacher ? 'Sesi Saya Bulan Ini' : 'Total Sesi Bulan Ini'}
              </span>
              <div className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 text-slate-600">
                <BookOpenCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-semibold text-slate-900 font-mono">
              {totalSessionsMonth} <span className="text-xs font-normal">Sesi</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" /> ~{totalHoursMonth} Jam Mengajar
            </p>
          </Card>
        )}
      </div>

      {/* Real-Time Database Payroll Recap Card - Scoped for Teacher vs Admin */}
      {can('read', 'penggajian') && (
        <Card variant="emerald" className="p-6 border border-emerald-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-200/70 text-emerald-900 font-semibold text-[11px]">
                <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  {isTeacher
                    ? `Honor Saya Bulan Ini (${currentMonthLabel})`
                    : `Total Honor Pengajar Bulan Ini (${currentMonthLabel})`}
                </span>
              </div>
              <div className="text-3xl font-semibold text-emerald-950 font-mono pt-1">
                {formatRupiah(totalPayrollReal)}
              </div>
              <p className="text-xs text-emerald-800 font-medium">
                {isTeacher
                  ? `Dihitung dari ${totalSessionsMonth} sesi mengajar terverifikasi milik Anda x tarif honor per sesi (${formatRupiah(loggedInTeacher?.session_rate || 85000)}).`
                  : `Dihitung dari total akumulasi presensi sesi mengajar terverifikasi di database (${totalSessionsMonth} sesi) x tarif honor masing-masing guru.`}
              </p>
            </div>

            <Link href="/penggajian">
              <Badge variant="emerald" size="md" className="cursor-pointer hover:bg-emerald-200 transition">
                {isTeacher ? 'Lihat Slip Gaji Saya' : 'Lihat Rekap Payroll Lengkap'} <ArrowRight className="w-4 h-4 ml-1" />
              </Badge>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
