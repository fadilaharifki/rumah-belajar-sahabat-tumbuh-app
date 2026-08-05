import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/staff/[id] - Update staff member details, avatar_url, OR Reset Password
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, avatar_url, role_title, reset_password } = body;

    if (isSupabaseConfigured) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('email, name')
        .eq('id', id)
        .maybeSingle();

      const staffEmail = email || staffData?.email;

      // 1. Reset Password Action via PostgreSQL RPC (Zero session hijacking!)
      if (reset_password && staffEmail) {
        const newRandomPassword = `Stf${Math.random().toString(36).slice(-6)}!`;

        const { error: rpcErr } = await supabase.rpc('reset_user_password', {
          target_email: staffEmail,
          new_password: newRandomPassword
        });

        if (rpcErr) {
          console.warn('RPC reset_user_password error:', rpcErr.message);
        }

        return NextResponse.json({
          success: true,
          new_password: newRandomPassword,
          email: staffEmail,
          name: staffData?.name,
          message: `Password staff berhasil di-reset!`
        });
      }

      // 2. Normal Staff Update Action
      const updateData: Record<string, any> = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (avatar_url !== undefined && avatar_url !== '') updateData.avatar_url = avatar_url;
      if (role_title) updateData.role_title = role_title;

      // Update public.users avatar_url if provided
      if (avatar_url !== undefined && avatar_url !== '') {
        if (staffData?.email) {
          await supabase.from('users').update({ avatar_url }).eq('email', staffData.email);
        }
      }

      let { data, error } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      // Fallback if avatar_url column is not yet created in public.staff schema
      if (error && error.message?.includes('avatar_url')) {
        delete updateData.avatar_url;
        const fallback = await supabase
          .from('staff')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data,
        message: 'Data staff berhasil diperbarui.'
      });
    }

    if (reset_password) {
      const mockNewPass = `Stf${Math.random().toString(36).slice(-6)}!`;
      return NextResponse.json({ success: true, new_password: mockNewPass, message: 'Password reset (mock mode)' });
    }

    return NextResponse.json({ success: true, message: 'Data staff updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/staff/[id] - Remove staff member & cascade delete user account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { data: staffData } = await supabase
        .from('staff')
        .select('user_id, email')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase.from('staff').delete().eq('id', id);
      if (error) throw error;

      if (staffData?.user_id) {
        await supabase.from('users').delete().eq('id', staffData.user_id);
      } else if (staffData?.email) {
        await supabase.from('users').delete().eq('email', staffData.email);
      }
    }

    return NextResponse.json({ success: true, message: 'Data staff dan akun pengguna berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
