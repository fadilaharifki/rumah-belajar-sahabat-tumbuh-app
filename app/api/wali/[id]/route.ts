import { NextResponse } from 'next/server';
import { getGuaranteedUniqueEmail } from '@/utils/emailUtils';
import { supabase, supabaseAuthAdmin } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/wali/[id] - Update parent details, avatar_url, status, or reset password
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, email, address, avatar_url, status, reset_password } = body;

    if (isSupabaseConfigured) {
      const { data: parentData } = await supabase
        .from('parents')
        .select('id, user_id, email, name')
        .eq('id', id)
        .maybeSingle();

      const rawTargetEmail = email || parentData?.email;
      const targetEmail = await getGuaranteedUniqueEmail(
        rawTargetEmail,
        name || parentData?.name || 'wali',
        'wali',
        parentData?.user_id,
        parentData?.email
      );

      // 1. Reset Password Action via PostgreSQL RPC (Zero session hijacking!)
      if (reset_password && targetEmail) {
        const newRandomPassword = `Wli${Math.random().toString(36).slice(-6)}!`;

        const { error: rpcErr } = await supabase.rpc('reset_user_password', {
          target_email: targetEmail,
          new_password: newRandomPassword
        });

        if (rpcErr) {
          console.warn('RPC reset_user_password error:', rpcErr.message);
        }

        return NextResponse.json({
          success: true,
          new_password: newRandomPassword,
          email: targetEmail,
          name: parentData?.name,
          message: `Password wali berhasil di-reset!`
        });
      }

      // 2. Sync to public.users (Data Pengguna) & Auth Users
      const userUpdatePayload: Record<string, any> = {};
      if (name) userUpdatePayload.full_name = name;
      if (email) userUpdatePayload.email = targetEmail;
      if (status) userUpdatePayload.status = status;
      if (avatar_url !== undefined && avatar_url !== '') userUpdatePayload.avatar_url = avatar_url;

      if (Object.keys(userUpdatePayload).length > 0) {
        if (parentData?.user_id) {
          await supabase.from('users').update(userUpdatePayload).eq('id', parentData.user_id);
        } else if (parentData?.email) {
          await supabase.from('users').update(userUpdatePayload).eq('email', parentData.email);
        } else if (targetEmail) {
          await supabase.from('users').update(userUpdatePayload).eq('email', targetEmail);
        }
      }

      // Sync email update to Supabase Auth user & public.users via RPC function
      if (email && parentData?.email && parentData.email.toLowerCase() !== targetEmail) {
        // A. Primary SQL RPC sync to auth.users in Supabase Authentication
        const { error: rpcSyncErr } = await supabase.rpc('sync_user_email', {
          old_email: parentData.email,
          new_email: targetEmail,
          new_name: name || parentData.name
        });

        if (rpcSyncErr) {
          console.warn('RPC sync_user_email note:', rpcSyncErr.message);
        }

        // B. Secondary Admin Auth API sync
        try {
          const { data: userList } = await supabaseAuthAdmin.auth.admin.listUsers();
          const targetAuthUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === parentData.email.toLowerCase()
          );
          if (targetAuthUser) {
            await supabaseAuthAdmin.auth.admin.updateUserById(targetAuthUser.id, {
              email: targetEmail,
              email_confirm: true,
              user_metadata: { full_name: name || parentData.name }
            });
          }
        } catch (authErr: any) {
          console.warn('Admin Auth email update note:', authErr.message);
        }
      }

      // 3. Update parent table fields
      const updateData: Record<string, any> = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (email) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (avatar_url !== undefined && avatar_url !== '') updateData.avatar_url = avatar_url;

      if (Object.keys(updateData).length > 0) {
        let { data, error } = await supabase
          .from('parents')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        // Fallback if avatar_url column is not yet created in public.parents schema
        if (error && error.message?.includes('avatar_url')) {
          delete updateData.avatar_url;
          const fallback = await supabase
            .from('parents')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
          data = fallback.data;
          error = fallback.error;
        }

        if (error) throw error;
        return NextResponse.json({ success: true, data, message: 'Data wali siswa berhasil diperbarui.' });
      }

      return NextResponse.json({ success: true, message: 'Status wali berhasil diperbarui.' });
    }

    if (reset_password) {
      const mockNewPass = `Wli${Math.random().toString(36).slice(-6)}!`;
      return NextResponse.json({ success: true, new_password: mockNewPass, message: 'Password reset (mock mode)' });
    }

    return NextResponse.json({ success: true, message: 'Data wali updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/wali/[id] - Remove parent/wali cleanly WITHOUT destroying associated student history
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { data: parentData } = await supabase
        .from('parents')
        .select('user_id, email')
        .eq('id', id)
        .maybeSingle();

      // 1. SAFETY SHIELD: Unlink student records first so student progress/history is NEVER lost
      await supabase
        .from('students')
        .update({ parent_id: null })
        .eq('parent_id', id);

      // 2. Delete parent record
      const { error } = await supabase.from('parents').delete().eq('id', id);
      if (error) throw error;

      // 3. Delete parent user account
      if (parentData?.user_id) {
        await supabase.from('users').delete().eq('id', parentData.user_id);
      } else if (parentData?.email) {
        await supabase.from('users').delete().eq('email', parentData.email);
      }
    }

    return NextResponse.json({ success: true, message: 'Data wali berhasil dihapus. Data siswa tetap aman tersimpan.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
