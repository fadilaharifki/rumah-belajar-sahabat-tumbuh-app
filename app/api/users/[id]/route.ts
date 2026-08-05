import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/users/[id] - Update user assigned role or status
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role_id, status } = body;

    if (isSupabaseConfigured) {
      const updatePayload: Record<string, any> = {};
      if (role_id) updatePayload.role_id = role_id;
      if (status) updatePayload.status = status;

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
        message: 'Peran akun pengguna berhasil diperbarui di database!'
      });
    }

    return NextResponse.json({ success: true, message: 'Role updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Remove user record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'User berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
