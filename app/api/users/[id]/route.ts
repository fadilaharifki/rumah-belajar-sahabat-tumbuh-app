import { NextResponse } from 'next/server';
import { supabase, supabaseAuthAdmin } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/users/[id] - Update user assigned role, email, name, or status with automatic bi-directional sync
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role_id, status, full_name, email, avatar_url } = body;

    if (isSupabaseConfigured) {
      // 1. Fetch existing user record to know category and old email
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const oldEmail = existingUser?.email;
      const targetEmail = email ? email.toLowerCase().trim() : oldEmail;

      const updatePayload: Record<string, any> = {};
      if (role_id) updatePayload.role_id = role_id;
      if (status) updatePayload.status = status;
      if (full_name) updatePayload.full_name = full_name;
      if (email) updatePayload.email = targetEmail;
      if (avatar_url) updatePayload.avatar_url = avatar_url;

      const { data, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 2. Sync email change to Supabase Auth User via RPC + Admin Auth API
      if (email && oldEmail && oldEmail.toLowerCase() !== targetEmail) {
        // A. Primary SQL RPC sync to auth.users in Supabase Authentication
        const { error: rpcSyncErr } = await supabase.rpc('sync_user_email', {
          old_email: oldEmail,
          new_email: targetEmail,
          new_name: full_name || existingUser?.full_name
        });

        if (rpcSyncErr) {
          console.warn('RPC sync_user_email note:', rpcSyncErr.message);
        }

        // B. Secondary Admin Auth API sync
        try {
          const { data: userList } = await supabaseAuthAdmin.auth.admin.listUsers();
          const targetAuthUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === oldEmail.toLowerCase()
          );
          if (targetAuthUser) {
            await supabaseAuthAdmin.auth.admin.updateUserById(targetAuthUser.id, {
              email: targetEmail,
              email_confirm: true,
              user_metadata: { full_name: full_name || existingUser?.full_name }
            });
          }
        } catch (authErr: any) {
          console.warn('Admin Auth user sync note:', authErr.message);
        }
      }

      // 3. Bi-directional sync to teachers / parents / staff tables
      if (existingUser?.category === 'Guru' || existingUser?.role_id === '22222222-2222-2222-2222-000000000002') {
        const tPayload: Record<string, any> = {};
        if (full_name) tPayload.name = full_name;
        if (email) tPayload.email = targetEmail;
        if (status) tPayload.status = status;
        if (avatar_url) tPayload.photo_url = avatar_url;

        if (Object.keys(tPayload).length > 0) {
          if (existingUser.teacher_id) {
            await supabase.from('teachers').update(tPayload).eq('id', existingUser.teacher_id);
          } else if (oldEmail) {
            await supabase.from('teachers').update(tPayload).eq('email', oldEmail);
          }
        }
      } else if (existingUser?.category === 'Wali' || existingUser?.role_id === '33333333-3333-3333-3333-000000000003') {
        const pPayload: Record<string, any> = {};
        if (full_name) pPayload.name = full_name;
        if (email) pPayload.email = targetEmail;
        if (status) pPayload.status = status;
        if (avatar_url) pPayload.avatar_url = avatar_url;

        if (Object.keys(pPayload).length > 0) {
          if (existingUser.parent_id) {
            await supabase.from('parents').update(pPayload).eq('id', existingUser.parent_id);
          } else if (oldEmail) {
            await supabase.from('parents').update(pPayload).eq('email', oldEmail);
          }
        }
      } else if (existingUser?.category === 'Staff') {
        const sPayload: Record<string, any> = {};
        if (full_name) sPayload.name = full_name;
        if (email) sPayload.email = targetEmail;
        if (avatar_url) sPayload.avatar_url = avatar_url;

        if (Object.keys(sPayload).length > 0 && oldEmail) {
          await supabase.from('staff').update(sPayload).eq('email', oldEmail);
        }
      }

      return NextResponse.json({
        success: true,
        data,
        message: 'Data pengguna dan tabel entitas terkait berhasil diperbarui!'
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
