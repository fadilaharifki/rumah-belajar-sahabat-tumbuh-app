import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/presensi/[id] - Manual verification / update by Admin (Istri Pemilik)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, check_in, check_out, duration_minutes } = body;

    if (isSupabaseConfigured) {
      const updatePayload: Record<string, any> = {};
      if (status) updatePayload.status = status;
      if (check_in) updatePayload.check_in = check_in;
      if (check_out !== undefined) updatePayload.check_out = check_out;
      if (duration_minutes !== undefined) updatePayload.duration_minutes = duration_minutes;

      const { data, error } = await supabase
        .from('attendance_records')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
        message: status === 'ManualVerified'
          ? 'Sesi berhasil divalidasi manual oleh Admin!'
          : 'Presensi berhasil diperbarui.'
      });
    }

    return NextResponse.json({ success: true, message: 'Presensi updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/presensi/[id] - Delete attendance record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('attendance_records').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Rekod presensi berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
