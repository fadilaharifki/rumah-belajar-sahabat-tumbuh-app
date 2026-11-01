import { NextResponse } from 'next/server';
import { getGuaranteedUniqueEmail } from '@/utils/emailUtils';
import { supabase, supabaseAuthAdmin } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

const GURU_ROLE_ID = '22222222-2222-2222-2222-000000000002';

// PUT /api/guru/[id] - Update teacher details, photo_url, status, OR Reset Password
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, session_rate, photo_url, avatar_url, subjects, status, reset_password, supervisor_id } = body;

    const targetPhoto = photo_url || avatar_url;

    if (isSupabaseConfigured) {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id, user_id, email, name, phone')
        .eq('id', id)
        .maybeSingle();

      const rawTargetEmail = email || teacherData?.email;
      const teacherEmail = await getGuaranteedUniqueEmail(
        rawTargetEmail,
        name || teacherData?.name || 'guru',
        'guru',
        teacherData?.user_id,
        teacherData?.email
      );

      // 1. Reset Password Action (RPC + Admin Auth Sync)
      if (reset_password && teacherEmail) {
        const newRandomPassword = `Gru${Math.random().toString(36).slice(-6)}!`;

        // A. Primary RPC reset_user_password (pgcrypto + auto-confirm email)
        const { error: rpcErr } = await supabase.rpc('reset_user_password', {
          target_email: teacherEmail,
          new_password: newRandomPassword
        });

        if (rpcErr) {
          console.warn('RPC reset_user_password error:', rpcErr.message);
        }

        // B. Secondary Admin Auth API sync
        try {
          const { data: userList } = await supabaseAuthAdmin.auth.admin.listUsers();
          const targetAuthUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === teacherEmail
          );

          if (targetAuthUser) {
            await supabaseAuthAdmin.auth.admin.updateUserById(targetAuthUser.id, {
              password: newRandomPassword,
              email_confirm: true
            });
          }
        } catch (err: any) {
          console.warn('Admin Auth reset note:', err.message);
        }

        return NextResponse.json({
          success: true,
          new_password: newRandomPassword,
          email: teacherEmail,
          name: teacherData?.name,
          message: `Password guru berhasil di-reset!`
        });
      }

      // 2. Sync to public.users (Data Pengguna) & Auth Users
      const userUpdatePayload: Record<string, any> = {};
      if (name) userUpdatePayload.full_name = name;
      if (email) userUpdatePayload.email = (teacherEmail || '').toLowerCase().trim();
      if (phone) userUpdatePayload.phone = phone;
      if (status) userUpdatePayload.status = status;
      if (targetPhoto !== undefined && targetPhoto !== '') userUpdatePayload.avatar_url = targetPhoto;

      let targetUserId = teacherData?.user_id;

      // If user_id is not already linked on teacher, find the user by email (case-insensitive)
      if (!targetUserId) {
        const searchEmail = (teacherData?.email || teacherEmail || '').toLowerCase().trim();
        if (searchEmail) {
          const { data: foundUser } = await supabase
            .from('users')
            .select('id')
            .ilike('email', searchEmail)
            .maybeSingle();

          if (foundUser?.id) {
            targetUserId = foundUser.id;
            // Link teacher to this user_id immediately to heal relationship
            await supabase.from('teachers').update({ user_id: foundUser.id }).eq('id', id);
          }
        }
      }

      if (Object.keys(userUpdatePayload).length > 0) {
        if (targetUserId) {
          await supabase.from('users').update(userUpdatePayload).eq('id', targetUserId);
        } else {
          // If user record doesn't exist yet in public.users, create it now (upsert)!
          const cleanEmail = (teacherEmail || teacherData?.email || '').toLowerCase().trim();
          if (cleanEmail) {
            const { data: newUser } = await supabase
              .from('users')
              .upsert([
                {
                  email: cleanEmail,
                  full_name: name || teacherData?.name || 'Guru',
                  phone: phone || teacherData?.phone || '',
                  avatar_url: targetPhoto || '',
                  category: 'Guru',
                  role_id: GURU_ROLE_ID,
                  status: status || 'Aktif'
                }
              ], { onConflict: 'email' })
              .select()
              .single();

            if (newUser?.id) {
              await supabase.from('teachers').update({ user_id: newUser.id }).eq('id', id);
            }
          }
        }
      }

      // Sync email update to Supabase Auth user & public.users via RPC function
      if (email && teacherData?.email && teacherData.email.toLowerCase() !== teacherEmail) {
        // A. Primary SQL RPC sync to auth.users in Supabase Authentication
        const { error: rpcSyncErr } = await supabase.rpc('sync_user_email', {
          old_email: teacherData.email,
          new_email: teacherEmail,
          new_name: name || teacherData.name
        });

        if (rpcSyncErr) {
          console.warn('RPC sync_user_email note:', rpcSyncErr.message);
        }

        // B. Secondary Admin Auth API sync
        try {
          const { data: userList } = await supabaseAuthAdmin.auth.admin.listUsers();
          const targetAuthUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === teacherData.email.toLowerCase()
          );
          if (targetAuthUser) {
            await supabaseAuthAdmin.auth.admin.updateUserById(targetAuthUser.id, {
              email: teacherEmail,
              email_confirm: true,
              user_metadata: { full_name: name || teacherData.name }
            });
          }
        } catch (authErr: any) {
          console.warn('Admin Auth email update note:', authErr.message);
        }
      }

      // 3. Update teacher table fields
      const updateData: Record<string, any> = {};
      if (name) updateData.name = name;
      if (email) updateData.email = teacherEmail;
      if (phone) updateData.phone = phone;
      if (session_rate !== undefined) updateData.session_rate = session_rate;
      if (targetPhoto !== undefined && targetPhoto !== '') updateData.photo_url = targetPhoto;
      if (subjects) updateData.subjects = subjects;
      if (supervisor_id !== undefined) updateData.supervisor_id = supervisor_id;
      if (status) updateData.status = status;

      if (Object.keys(updateData).length > 0) {
        const { data, error } = await supabase
          .from('teachers')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data, message: 'Data guru berhasil diperbarui.' });
      }

      return NextResponse.json({ success: true, message: 'Status guru berhasil diperbarui.' });
    }

    if (reset_password) {
      const mockNewPass = `Gru${Math.random().toString(36).slice(-6)}!`;
      return NextResponse.json({ success: true, new_password: mockNewPass, message: 'Password reset (mock mode)' });
    }

    return NextResponse.json({ success: true, message: 'Data guru updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/guru/[id] - Remove teacher & cascade delete user account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('user_id, email')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;

      if (teacherData?.user_id) {
        await supabase.from('users').delete().eq('id', teacherData.user_id);
      } else if (teacherData?.email) {
        await supabase.from('users').delete().eq('email', teacherData.email);
      }
    }

    return NextResponse.json({ success: true, message: 'Data guru dan akun pengguna berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
