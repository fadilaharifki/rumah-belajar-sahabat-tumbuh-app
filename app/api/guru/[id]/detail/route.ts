import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/guru/[id]/detail?month=YYYY-MM - Fetch teacher attendance, schedules, assigned students, & auto-synced payroll details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        attendance: [],
        schedules: [],
        students: [],
        payroll: null,
        source: 'mock'
      });
    }

    // 1. Fetch teacher details to confirm rate
    const { data: teacher } = await supabase
      .from('teachers')
      .select('*, users(status, avatar_url)')
      .eq('id', id)
      .maybeSingle();

    if (!teacher) {
      return NextResponse.json({ error: 'Guru tidak ditemukan' }, { status: 404 });
    }

    // 2. Fetch Attendance Records for this teacher using SQL join
    const { data: attendanceData } = await supabase
      .from('attendance_records')
      .select('*, students(name)')
      .eq('teacher_id', id)
      .order('date', { ascending: false });

    const attendanceList = (attendanceData || []).map((att: any) => ({
      id: att.id,
      date: att.date,
      student_name: att.students?.name || 'Siswa Bimbingan',
      check_in: att.check_in,
      check_out: att.check_out || '-',
      duration_minutes: att.duration_minutes || 60,
      status: att.status || 'Terverifikasi'
    }));

    // Filter attendance by requested month
    const monthAttendance = attendanceList.filter((att: any) =>
      att.date.startsWith(month)
    );

    // 3. Fetch Schedules for this teacher via SQL join
    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('*, students(*, parents(name, phone, email))')
      .eq('teacher_id', id)
      .order('start_time');

    const formattedSchedules = (schedulesData || []).map((sch: any) => ({
      id: sch.id,
      teacher_id: sch.teacher_id,
      teacher_name: teacher.name,
      teacher_photo: teacher.photo_url || teacher.users?.avatar_url || '',
      student_id: sch.student_id,
      student_name: sch.students?.name || 'Siswa Bimbingan',
      student_grade: sch.students?.grade || 'SD',
      student_avatar: sch.students?.avatar_url || '',
      day_of_week: sch.day_of_week,
      start_time: sch.start_time ? sch.start_time.substring(0, 5) : '14:00',
      end_time: sch.end_time ? sch.end_time.substring(0, 5) : '15:00',
      room: sch.room || 'Ruang Utama',
      status: sch.status || 'Aktif'
    }));

    let assignedStudents = (schedulesData || []).map((sch: any) => ({
      id: sch.students?.id || sch.id,
      name: sch.students?.name || 'Siswa Bimbingan',
      grade: sch.students?.grade || 'SD',
      parent_name: sch.students?.parents?.name || 'Orang Tua / Wali',
      parent_phone: sch.students?.parents?.phone || '-',
      notes: sch.students?.notes || '',
      avatar_url: sch.students?.avatar_url || ''
    }));

    // Fallback: If no schedules assigned yet, fetch all students to display options
    if (assignedStudents.length === 0) {
      const { data: allStudents } = await supabase
        .from('students')
        .select('*, parents(name, phone, email)')
        .limit(10);

      assignedStudents = (allStudents || []).map((std: any) => ({
        id: std.id,
        name: std.name,
        grade: std.grade,
        parent_name: std.parents?.name || 'Orang Tua / Wali',
        parent_phone: std.parents?.phone || '-',
        notes: std.notes || '',
        avatar_url: std.avatar_url || ''
      }));
    }

    // 4. Fetch OR Auto-Sync Payroll record in DB table public.payrolls (Default status: 'Draft')
    const sessionRate = teacher.session_rate || 85000;
    const totalSessions = monthAttendance.length;
    const totalAmount = totalSessions * sessionRate;

    let { data: payrollData } = await supabase
      .from('payrolls')
      .select('*')
      .eq('teacher_id', id)
      .eq('period_month', month)
      .maybeSingle();

    // Auto-upsert into DB table if attendance exists so DB table public.payrolls gets populated!
    if (totalSessions > 0) {
      try {
        const { data: synced } = await supabase
          .from('payrolls')
          .upsert([
            {
              teacher_id: id,
              period_month: month,
              total_sessions: totalSessions,
              rate_per_session: sessionRate,
              total_amount: totalAmount,
              status: payrollData?.status || 'Draft',
              paid_at: payrollData?.paid_at || null
            }
          ], { onConflict: 'teacher_id,period_month' })
          .select()
          .maybeSingle();

        if (synced) payrollData = synced;
      } catch (err: any) {
        console.warn('DB payroll auto-sync note:', err.message);
      }
    }

    const payrollObj = {
      period_month: month,
      total_sessions: totalSessions,
      rate_per_session: sessionRate,
      total_amount: payrollData?.total_amount || totalAmount,
      status: payrollData?.status || 'Draft'
    };

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        session_rate: sessionRate,
        photo_url: teacher.photo_url || teacher.users?.avatar_url || '',
        avatar_url: teacher.photo_url || teacher.users?.avatar_url || '',
        subjects: teacher.subjects || ['Umum', 'Pendampingan'],
        status: teacher.users?.status || teacher.status || 'Aktif'
      },
      attendance: monthAttendance,
      schedules: formattedSchedules,
      all_attendance: attendanceList,
      students: assignedStudents,
      payroll: payrollObj,
      source: 'supabase'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
