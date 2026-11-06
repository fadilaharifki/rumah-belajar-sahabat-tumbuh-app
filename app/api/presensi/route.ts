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
        status: att.status || (logs ? (logs.approval_status || 'PendingApproval') : 'CheckIn'),
        approved_by: att.approved_by || null,
        approval_notes: att.approval_notes || (logs ? logs.rejection_reason : null),
        approved_at: att.approved_at || (logs ? logs.approved_at : null),
        created_at: att.created_at,
        updated_at: att.updated_at,
        session_log: logs
          ? {
              id: logs.id,
              session_number: logs.session_number || 1,
              activities: logs.activities,
              results_recommendations: logs.results_recommendations,
              approval_status: logs.approval_status || 'PendingApproval',
              approver_id: logs.approver_id,
              rejection_reason: logs.rejection_reason,
              created_at: logs.created_at,
              updated_at: logs.updated_at
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
    const { teacher_id, student_id, schedule_id, date, check_in, bypass_schedule } = body;

    if (!teacher_id || !student_id) {
      return NextResponse.json(
        { success: false, error: 'Guru dan Siswa wajib dipilih!' },
        { status: 400 }
      );
    }

    // Deterministic Western Indonesia Time (WIB = UTC+7)
    const todayDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const nowTime = check_in || new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

    // Indonesian Day of Week based on WIB date
    const DAYS_OF_WEEK_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
    const [y, m, d] = todayDate.split('-').map(Number);
    const dateUtcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeek = DAYS_OF_WEEK_ID[dateUtcNoon.getUTCDay()];

    if (isSupabaseConfigured) {
      // 1. Validasi Jadwal Siswa (Harus memiliki jadwal aktif di hari ini dan bersama guru ini, kecuali ada flag bypass_schedule)
      const { data: studentSchedules, error: schError } = await supabase
        .from('schedules')
        .select('id, teacher_id, student_id, day_of_week, start_time, end_time, room, status, teachers(name), students(name)')
        .eq('student_id', student_id);

      const activeSchedules = (studentSchedules || []).filter((s: any) => s.status !== 'Nonaktif');
      const todaySchedules = activeSchedules.filter((s: any) => s.day_of_week === dayOfWeek);
      const matchingSchedule = todaySchedules.find((s: any) => s.teacher_id === teacher_id);

      if (!bypass_schedule) {
        // Cek apakah siswa memiliki jadwal bimbingan di sistem
        if (activeSchedules.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'Tidak dapat Check-In! Siswa belum memiliki jadwal bimbingan aktif di sistem. Silakan atur jadwal di menu Jadwal Ngajar terlebih dahulu.'
            },
            { status: 400 }
          );
        }

        // Cek apakah siswa memiliki jadwal pada hari ini (dayOfWeek)
        if (todaySchedules.length === 0) {
          const availableDays = Array.from(
            new Set(activeSchedules.map((s: any) => `${s.day_of_week} (${(s.start_time || '').slice(0, 5)} - ${(s.end_time || '').slice(0, 5)})`))
          ).join(', ');
          return NextResponse.json(
            {
              success: false,
              error: `Tidak dapat Check-In! Siswa tidak memiliki jadwal bimbingan pada hari ${dayOfWeek}. Jadwal belajar siswa: ${availableDays}.`
            },
            { status: 400 }
          );
        }

        // Cek apakah guru yang check-in sesuai dengan guru yang terdaftar di jadwal siswa hari ini
        if (!matchingSchedule) {
          const scheduledInfo = todaySchedules
            .map((s: any) => `${s.teachers?.name || 'Guru lain'} (${(s.start_time || '').slice(0, 5)} - ${(s.end_time || '').slice(0, 5)})`)
            .join(', ');
          return NextResponse.json(
            {
              success: false,
              error: `Tidak dapat Check-In! Pada hari ${dayOfWeek}, siswa dijadwalkan belajar bersama ${scheduledInfo}, bukan guru yang dipilih.`
            },
            { status: 400 }
          );
        }
      }

      const resolvedScheduleId = schedule_id || matchingSchedule?.id || null;

      // Check if attendance record already exists for this teacher, student, schedule & date
      let existingQuery = supabase
        .from('attendance_records')
        .select('id, status')
        .eq('teacher_id', teacher_id)
        .eq('student_id', student_id)
        .eq('date', todayDate);

      if (resolvedScheduleId) {
        existingQuery = existingQuery.eq('schedule_id', resolvedScheduleId);
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
            schedule_id: resolvedScheduleId,
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
              schedule_id: resolvedScheduleId,
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
