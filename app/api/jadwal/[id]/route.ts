import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/jadwal/[id] - Update schedule details via SQL Relational Join
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id, student_id, day_of_week, start_time, end_time, room, status } = body;

    if (isSupabaseConfigured) {
      const updateData: Record<string, any> = {};
      if (teacher_id) updateData.teacher_id = teacher_id;
      if (student_id) updateData.student_id = student_id;
      if (day_of_week) updateData.day_of_week = day_of_week;
      if (start_time) updateData.start_time = start_time;
      if (end_time) updateData.end_time = end_time;
      if (room !== undefined) updateData.room = room;
      if (status !== undefined) updateData.status = status;

      const { data, error } = await supabase
        .from('schedules')
        .update(updateData)
        .eq('id', id)
        .select('*, teachers(id, name, photo_url, phone), students(id, name, grade, avatar_url)')
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          teacher_id: data.teacher_id,
          teacher_name: data.teachers?.name || 'Guru Pengajar',
          teacher_photo: data.teachers?.photo_url || '',
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
        message: 'Jadwal ngajar berhasil diperbarui.'
      });
    }

    return NextResponse.json({ success: true, message: 'Jadwal updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/jadwal/[id] - Remove schedule entry
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Jadwal ngajar berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
