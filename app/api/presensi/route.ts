import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/presensi - List all attendance records joined with teachers, students, & paired session logs (Supports pagination & infinite scroll)
export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const page = Number(searchParams.get('page')) || 0;
    const limit = Number(searchParams.get('limit')) || 0;

    // 1. Query attendance records joined with teachers & students
    let query = supabase
      .from('attendance_records')
      .select('*, teachers!fk_attendance_teacher(id, name, photo_url, phone), students!fk_attendance_student(id, name, grade, avatar_url)', { count: 'exact' })
      .order('date', { ascending: false });

    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    if (page > 0 && limit > 0) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    let { data: attendanceData, error, count } = await query;

    // Fallback if named FK constraint hint is different
    if (error) {
      console.warn('Primary attendance query note:', error.message);
      let fallbackQuery = supabase
        .from('attendance_records')
        .select('*, teachers(id, name, photo_url, phone), students(id, name, grade, avatar_url)', { count: 'exact' })
        .order('date', { ascending: false });

      if (teacherId) {
        fallbackQuery = fallbackQuery.eq('teacher_id', teacherId);
      }

      if (page > 0 && limit > 0) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        fallbackQuery = fallbackQuery.range(from, to);
      }

      const fallbackRes = await fallbackQuery;
      attendanceData = fallbackRes.data;
      error = fallbackRes.error;
      count = fallbackRes.count;
    }

    if (error) {
      return NextResponse.json({ data: [], error: error.message }, { status: 400 });
    }

    // 2. Query session logs separately by attendance_id OR by (teacher_id + student_id + date)
    const studentIds = (attendanceData || []).map((a: any) => a.student_id).filter(Boolean);
    const sessionLogsMapByAtt: Record<string, any> = {};
    const sessionLogsMapByTeacherStudentDate: Record<string, any> = {};

    if (studentIds.length > 0) {
      try {
        const { data: logsData } = await supabase
          .from('session_logs')
          .select('*')
          .in('student_id', studentIds);

        if (logsData) {
          logsData.forEach((log: any) => {
            if (log.attendance_id) {
              sessionLogsMapByAtt[log.attendance_id] = log;
            }
            if (log.teacher_id && log.student_id && log.session_date) {
              const key = `${log.teacher_id}_${log.student_id}_${log.session_date}`;
              sessionLogsMapByTeacherStudentDate[key] = log;
            }
          });
        }
      } catch (err: any) {
        console.warn('Session logs map query note:', err.message);
      }
    }

    // 3. Format complete response payload with robust matching scoped strictly by teacher + student + date
    const formatted = (attendanceData || []).map((att: any) => {
      const teacherStudentDateKey = `${att.teacher_id}_${att.student_id}_${att.date}`;
      const logs = sessionLogsMapByAtt[att.id] || sessionLogsMapByTeacherStudentDate[teacherStudentDateKey] || null;

      const isValid = att.status === 'Valid' || att.status === 'ManualVerified' || Boolean(logs);

      return {
        id: att.id,
        schedule_id: att.schedule_id,
        teacher_id: att.teacher_id,
        teacher_name: att.teachers?.name || 'Guru Pengajar',
        teacher_photo: att.teachers?.photo_url || '',
        student_id: att.student_id,
        student_name: att.students?.name || 'Siswa Bimbingan',
        student_grade: att.students?.grade || 'SD',
        student_avatar: att.students?.avatar_url || '',
        date: att.date,
        check_in: att.check_in ? att.check_in.substring(0, 5) : '14:00',
        check_out: att.check_out ? att.check_out.substring(0, 5) : '-',
        duration_minutes: att.duration_minutes || 90,
        status: isValid ? (att.status === 'ManualVerified' ? 'ManualVerified' : 'Valid') : 'CheckIn',
        session_log: logs
          ? {
              id: logs.id,
              session_number: logs.session_number || 1,
              activities: logs.activities,
              results_recommendations: logs.results_recommendations
            }
          : null
      };
    });

    return NextResponse.json({
      data: formatted,
      totalCount: count || formatted.length,
      page,
      limit,
      source: 'supabase'
    });
  } catch (err: any) {
    return NextResponse.json({ data: [], error: err.message }, { status: 500 });
  }
}

// POST /api/presensi - 1-Click Check-In (No camera photo required!)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacher_id, student_id, schedule_id, date, check_in } = body;

    if (!teacher_id || !student_id) {
      return NextResponse.json(
        { success: false, error: 'Guru dan Siswa wajib dipilih!' },
        { status: 400 }
      );
    }

    const todayDate = date || new Date().toISOString().slice(0, 10);
    const nowTime = check_in || new Date().toTimeString().slice(0, 5);

    if (isSupabaseConfigured) {
      // Check if attendance record already exists for this teacher, student, schedule & date
      let existingQuery = supabase
        .from('attendance_records')
        .select('id, status')
        .eq('teacher_id', teacher_id)
        .eq('student_id', student_id)
        .eq('date', todayDate);

      if (schedule_id) {
        existingQuery = existingQuery.eq('schedule_id', schedule_id);
      }

      const { data: existing } = await existingQuery.maybeSingle();

      if (existing) {
        return NextResponse.json({
          success: true,
          data: existing,
          message: 'Guru sudah melakukan Check-In untuk sesi ini hari ini!'
        });
      }

      // Insert new 1-click Check-In record
      let { data, error } = await supabase
        .from('attendance_records')
        .insert([
          {
            teacher_id,
            student_id,
            schedule_id: schedule_id || null,
            date: todayDate,
            check_in: nowTime,
            status: 'CheckIn'
          }
        ])
        .select('*, teachers!fk_attendance_teacher(id, name, photo_url), students!fk_attendance_student(id, name, grade, avatar_url)')
        .single();

      if (error) {
        const fallbackRes = await supabase
          .from('attendance_records')
          .insert([
            {
              teacher_id,
              student_id,
              schedule_id: schedule_id || null,
              date: todayDate,
              check_in: nowTime,
              status: 'CheckIn'
            }
          ])
          .select('*, teachers(id, name, photo_url), students(id, name, grade, avatar_url)')
          .single();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          schedule_id: data.schedule_id,
          teacher_id: data.teacher_id,
          teacher_name: data.teachers?.name || 'Guru Pengajar',
          teacher_photo: data.teachers?.photo_url || '',
          student_id: data.student_id,
          student_name: data.students?.name || 'Siswa Bimbingan',
          student_grade: data.students?.grade || 'SD',
          date: data.date,
          check_in: data.check_in ? data.check_in.substring(0, 5) : nowTime,
          status: 'CheckIn'
        },
        message: 'Check-In 1-Klik Berhasil! Jangan lupa isi catatan laporan belajar siswa.'
      });
    }

    const mockData = {
      id: `att-${Date.now()}`,
      teacher_id,
      student_id,
      date: todayDate,
      check_in: nowTime,
      status: 'CheckIn'
    };

    return NextResponse.json({ success: true, data: mockData, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
