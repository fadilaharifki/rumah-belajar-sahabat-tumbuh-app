import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/siswa/[id]/detail - Fetch student profile, learning progress session logs, attendance history, and schedules
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        student: {
          id,
          name: 'Ananda Bintang Pratama',
          grade: 'SD Kelas 3',
          parent_name: 'Ibu Ratna',
          parent_phone: '081987654321',
          notes: 'Perlu bimbingan ekstra matematika dasar'
        },
        logs: [],
        attendance: [],
        schedules: []
      });
    }

    // 1. Fetch Student profile & parent details
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('*, parents(id, name, phone, email, address)')
      .eq('id', id)
      .maybeSingle();

    if (studentErr || !student) {
      return NextResponse.json(
        { success: false, error: 'Data siswa tidak ditemukan' },
        { status: 404 }
      );
    }

    // 2. Fetch Session Logs (Hasil Pembelajaran) for this student
    let { data: rawLogs, error: logErr } = await supabase
      .from('session_logs')
      .select('*, teachers!fk_session_logs_teacher(id, name, photo_url)')
      .eq('student_id', id)
      .order('session_date', { ascending: false });

    if (logErr) {
      const fallbackLogs = await supabase
        .from('session_logs')
        .select('*, teachers(id, name, photo_url)')
        .eq('student_id', id)
        .order('session_date', { ascending: false });

      rawLogs = fallbackLogs.data;
    }

    // Manual Teacher Map Fallback to guarantee teacher_name is NEVER empty
    const teacherIds = Array.from(new Set((rawLogs || []).map((l: any) => l.teacher_id).filter(Boolean)));
    const teacherMap: Record<string, any> = {};

    if (teacherIds.length > 0) {
      const { data: tData } = await supabase.from('teachers').select('id, name, photo_url').in('id', teacherIds);
      if (tData) {
        tData.forEach((t: any) => {
          teacherMap[t.id] = t;
        });
      }
    }

    const logs = (rawLogs || []).map((log: any) => {
      const tObj = log.teachers || teacherMap[log.teacher_id];
      return {
        id: log.id,
        session_number: log.session_number || 1,
        session_date: log.session_date,
        start_time: log.start_time ? log.start_time.substring(0, 5) : '14:00',
        end_time: log.end_time ? log.end_time.substring(0, 5) : '15:00',
        teacher_id: log.teacher_id,
        teacher_name: tObj?.name || 'Guru Pengajar',
        teacher_photo: tObj?.photo_url || '',
        student_id: log.student_id,
        activities: log.activities,
        results_recommendations: log.results_recommendations,
        verified: log.verified ?? true
      };
    });

    // 3. Fetch Attendance History for this student
    let { data: rawAttendance, error: attErr } = await supabase
      .from('attendance_records')
      .select('*, teachers!fk_attendance_teacher(id, name, photo_url)')
      .eq('student_id', id)
      .order('date', { ascending: false });

    if (attErr) {
      const fallbackAtt = await supabase
        .from('attendance_records')
        .select('*, teachers(id, name, photo_url)')
        .eq('student_id', id)
        .order('date', { ascending: false });

      rawAttendance = fallbackAtt.data;
    }

    const attendance = (rawAttendance || []).map((att: any) => {
      const tObj = att.teachers || teacherMap[att.teacher_id];
      return {
        id: att.id,
        date: att.date,
        teacher_name: tObj?.name || 'Guru Pengajar',
        teacher_photo: tObj?.photo_url || '',
        check_in: att.check_in ? att.check_in.substring(0, 5) : '14:00',
        check_out: att.check_out ? att.check_out.substring(0, 5) : '-',
        duration_minutes: att.duration_minutes || 60,
        status: att.status || 'Valid'
      };
    });

    // 4. Fetch Active Schedules for this student
    let { data: rawSchedules, error: schErr } = await supabase
      .from('schedules')
      .select('*, teachers!fk_schedules_teacher(id, name, photo_url, phone)')
      .eq('student_id', id)
      .order('day_of_week');

    if (schErr) {
      const fallbackSch = await supabase
        .from('schedules')
        .select('*, teachers(id, name, photo_url, phone)')
        .eq('student_id', id)
        .order('day_of_week');

      rawSchedules = fallbackSch.data;
    }

    const schedules = (rawSchedules || []).map((sch: any) => {
      const tObj = sch.teachers || teacherMap[sch.teacher_id];
      return {
        id: sch.id,
        day_of_week: sch.day_of_week,
        start_time: sch.start_time ? sch.start_time.substring(0, 5) : '14:00',
        end_time: sch.end_time ? sch.end_time.substring(0, 5) : '15:00',
        room: sch.room || 'Ruang Utama',
        teacher_name: tObj?.name || 'Guru Pengajar',
        teacher_photo: tObj?.photo_url || ''
      };
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        nickname: student.nickname,
        grade: student.grade,
        parent_id: student.parent_id,
        parent_name: student.parents?.name || 'Belum Dihubungkan',
        parent_phone: student.parents?.phone || '-',
        parent_email: student.parents?.email || '-',
        notes: student.notes,
        avatar_url: student.avatar_url || student.photo_url || ''
      },
      logs,
      attendance,
      schedules
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
