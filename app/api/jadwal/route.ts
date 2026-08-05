import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/jadwal - List all teaching schedules joined with teacher & student details via SQL Relational Join (Ordered by start_time)
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*, teachers(id, name, photo_url, phone, users(avatar_url)), students(id, name, grade, avatar_url)')
      .order('start_time', { ascending: true });

    if (error) {
      return NextResponse.json({ data: [], source: 'error', error: error.message }, { status: 400 });
    }

    const formatted = (data || []).map((s: any) => ({
      id: s.id,
      teacher_id: s.teacher_id,
      teacher_name: s.teachers?.name || 'Guru Pengajar',
      teacher_photo: s.teachers?.photo_url || s.teachers?.users?.avatar_url || '',
      teacher_phone: s.teachers?.phone || '',
      student_id: s.student_id,
      student_name: s.students?.name || 'Siswa Bimbingan',
      student_grade: s.students?.grade || 'SD',
      student_avatar: s.students?.avatar_url || '',
      day_of_week: s.day_of_week,
      start_time: s.start_time ? s.start_time.substring(0, 5) : '14:00',
      end_time: s.end_time ? s.end_time.substring(0, 5) : '15:00',
      room: s.room || 'Ruang Utama',
      status: s.status || 'Aktif'
    }));

    return NextResponse.json({ data: formatted, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ data: [], source: 'error', error: err.message }, { status: 500 });
  }
}

// POST /api/jadwal - Add a new teaching schedule
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacher_id, student_id, day_of_week, start_time, end_time, room, status } = body;

    if (!teacher_id || !student_id || !day_of_week || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'Guru, Siswa, Hari, dan Jam Ngajar wajib diisi!' },
        { status: 400 }
      );
    }

    const newSchedule = {
      teacher_id,
      student_id,
      day_of_week,
      start_time,
      end_time,
      room: room || 'Ruang Utama',
      status: status || 'Aktif'
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('schedules')
        .insert([newSchedule])
        .select('*, teachers(id, name, photo_url, phone, users(avatar_url)), students(id, name, grade, avatar_url)')
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          teacher_id: data.teacher_id,
          teacher_name: data.teachers?.name || 'Guru Pengajar',
          teacher_photo: data.teachers?.photo_url || data.teachers?.users?.avatar_url || '',
          student_id: data.student_id,
          student_name: data.students?.name || 'Siswa Bimbingan',
          student_grade: data.students?.grade || 'SD',
          student_avatar: data.students?.avatar_url || '',
          day_of_week: data.day_of_week,
          start_time: data.start_time ? data.start_time.substring(0, 5) : start_time,
          end_time: data.end_time ? data.end_time.substring(0, 5) : end_time,
          room: data.room || 'Ruang Utama',
          status: data.status || 'Aktif'
        },
        message: 'Jadwal ngajar baru berhasil ditambahkan!'
      });
    }

    const mockSchedule = {
      id: `sch-${Date.now()}`,
      teacher_id,
      teacher_name: 'Guru Pengajar',
      student_id,
      student_name: 'Siswa Bimbingan',
      day_of_week,
      start_time,
      end_time,
      room: room || 'Ruang Utama',
      status: status || 'Aktif'
    };

    return NextResponse.json({ success: true, data: mockSchedule, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
