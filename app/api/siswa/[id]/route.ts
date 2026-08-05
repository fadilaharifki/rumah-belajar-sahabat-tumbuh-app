import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/siswa/[id] - Update student details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, nickname, grade, parent_id, notes, avatar_url } = body;

    if (isSupabaseConfigured) {
      const updateData: Record<string, any> = {};
      if (name) updateData.name = name;
      if (nickname) updateData.nickname = nickname;
      if (grade) updateData.grade = grade;
      if (parent_id) updateData.parent_id = parent_id;
      if (notes !== undefined) updateData.notes = notes;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

      let { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select('*, parents(id, name, phone, email)')
        .single();

      // Fallback if avatar_url column in public.students is named photo_url in legacy DB
      if (error && error.message?.includes('avatar_url')) {
        delete updateData.avatar_url;
        updateData.photo_url = avatar_url;
        const fallback = await supabase
          .from('students')
          .update(updateData)
          .eq('id', id)
          .select('*, parents(id, name, phone, email)')
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          nickname: data.nickname,
          grade: data.grade,
          parent_id: data.parent_id,
          parent_name: data.parents?.name || 'Belum Dihubungkan',
          parent_phone: data.parents?.phone || '-',
          parent_email: data.parents?.email || '-',
          notes: data.notes,
          avatar_url: data.avatar_url || data.photo_url || ''
        },
        message: 'Data siswa berhasil diperbarui.'
      });
    }

    return NextResponse.json({ success: true, message: 'Data siswa updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/siswa/[id] - Remove student record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Data siswa berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
