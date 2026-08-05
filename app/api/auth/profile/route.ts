import { NextResponse } from 'next/server';
import { supabase, supabaseAuthAdmin } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/auth/profile - Update current user profile & password in both DB and Supabase Auth
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { current_email, full_name, email, phone, avatar_url, new_password } = body;

    const targetEmail = (current_email || email || '').toLowerCase().trim();

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'Email pengenal akun wajib ada!' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured) {
      const newEmailClean = email ? email.toLowerCase().trim() : targetEmail;

      // 1. If password change requested, update password in Supabase Auth & RPC
      if (new_password) {
        // A. Primary RPC Update (Hashes password using pgcrypto & auto-confirms email)
        const { error: rpcErr } = await supabase.rpc('reset_user_password', {
          target_email: targetEmail,
          new_password
        });

        if (rpcErr) {
          console.warn('RPC reset_user_password note:', rpcErr.message);
        }

        // B. Secondary Admin Auth API Update if Service Role is active
        try {
          const { data: userList } = await supabaseAuthAdmin.auth.admin.listUsers();
          const targetAuthUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === targetEmail
          );

          if (targetAuthUser) {
            await supabaseAuthAdmin.auth.admin.updateUserById(targetAuthUser.id, {
              password: new_password,
              email: newEmailClean,
              email_confirm: true
            });
          }
        } catch (err: any) {
          console.warn('Admin Auth update note:', err.message);
        }
      }

      // 2. Update public.users record
      const userUpdatePayload: Record<string, any> = {};
      if (full_name) userUpdatePayload.full_name = full_name;
      if (email) userUpdatePayload.email = newEmailClean;
      if (phone) userUpdatePayload.phone = phone;
      if (avatar_url) userUpdatePayload.avatar_url = avatar_url;

      if (Object.keys(userUpdatePayload).length > 0) {
        await supabase
          .from('users')
          .update(userUpdatePayload)
          .eq('email', targetEmail);
      }

      // 3. Sync to role specific tables (teachers, staff, parents)
      await Promise.all([
        supabase.from('teachers').update({ name: full_name, phone, photo_url: avatar_url, email: newEmailClean }).eq('email', targetEmail),
        supabase.from('staff').update({ name: full_name, phone, photo_url: avatar_url, email: newEmailClean }).eq('email', targetEmail),
        supabase.from('parents').update({ name: full_name, phone, email: newEmailClean }).eq('email', targetEmail)
      ]);

      return NextResponse.json({
        success: true,
        user: {
          full_name,
          email: newEmailClean,
          avatar_url
        },
        message: new_password
          ? 'Profil & kata sandi baru berhasil diperbarui! Anda dapat langsung login dengan kata sandi baru.'
          : 'Profil berhasil diperbarui!'
      });
    }

    return NextResponse.json({
      success: true,
      user: { full_name, email, avatar_url },
      message: 'Profil diperbarui (mock mode)'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
