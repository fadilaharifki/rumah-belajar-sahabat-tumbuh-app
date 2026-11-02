import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// POST /api/auth/login - Login via API Route using strict Supabase Auth credentials validation
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi!' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Strict Supabase Authentication Attempt
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      // If credentials do not match or user is not found in auth.users
      if (error || !data?.user) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email atau kata sandi tidak cocok. Silakan periksa kembali email dan kata sandi Anda.'
          },
          { status: 401 }
        );
      }

      // If Supabase Auth succeeded, extract user info
      const supaUser = data.user;
      let fullName = supaUser.user_metadata?.full_name || cleanEmail.split('@')[0];
      let role: 'admin' | 'staff' | 'teacher' | 'parent' =
        (supaUser.user_metadata?.role as any) || 'teacher';
      let avatarUrl = supaUser.user_metadata?.avatar_url;

      // Query public.users profile for role & status metadata
      let userRoleId: string | undefined;
      let userRoleName: string | undefined;
      let linkedTeacherId: string | undefined;
      let linkedParentId: string | undefined;

      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*, roles(*)')
          .or(`auth_user_id.eq.${supaUser.id},email.ilike.${cleanEmail}`)
          .maybeSingle();

        if (profile) {
          // Check if account status is active
          if (profile.status === 'Nonaktif') {
            return NextResponse.json(
              { success: false, error: 'Akun Anda dinonaktifkan. Silakan hubungi admin.' },
              { status: 403 }
            );
          }

          fullName = profile.full_name || fullName;
          avatarUrl = profile.avatar_url || avatarUrl;
          userRoleId = profile.role_id;
          userRoleName = profile.roles?.name;

          if (
            profile.role_id === '11111111-1111-1111-1111-000000000001' ||
            profile.category === 'Pemilik'
          ) {
            role = 'admin';
          } else if (
            profile.role_id === '44444444-4444-4444-4444-000000000004' ||
            profile.category === 'Staff'
          ) {
            role = 'staff';
          } else if (
            profile.role_id === '33333333-3333-3333-3333-000000000003' ||
            profile.category === 'Wali'
          ) {
            role = 'parent';
          } else {
            role = 'teacher';
          }

          // Link auth_user_id in public.users if not yet linked
          if (!profile.auth_user_id) {
            await supabase
              .from('users')
              .update({ auth_user_id: supaUser.id })
              .eq('id', profile.id);
          }

          // Resolve linked teacher or parent id
          const emailFilter = cleanEmail ? `email.ilike.${cleanEmail}` : '';
          const userFilter = profile.id ? `user_id.eq.${profile.id}` : '';
          const combinedOr = [emailFilter, userFilter].filter(Boolean).join(',');

          const [{ data: tData }, { data: pData }] = await Promise.all([
            supabase.from('teachers').select('id').or(combinedOr).maybeSingle(),
            supabase.from('parents').select('id').or(combinedOr).maybeSingle()
          ]);
          if (tData) linkedTeacherId = tData.id;
          if (pData) linkedParentId = pData.id;
        }
      } catch (profileErr: any) {
        console.warn('Profile fetch warning on login:', profileErr?.message);
      }

      if (!userRoleName && userRoleId) {
        if (userRoleId === '55555555-5555-5555-5555-000000000005') userRoleName = 'Guru Senior / Koordinator';
        else if (role === 'admin') userRoleName = 'Pemilik / Admin Utama';
        else if (role === 'teacher') userRoleName = 'Pengajar / Guru';
        else if (role === 'parent') userRoleName = 'Wali Siswa / Orang Tua';
        else if (role === 'staff') userRoleName = 'Staff Administrasi';
      }

      return NextResponse.json({
        success: true,
        user: {
          id: supaUser.id,
          full_name: fullName,
          email: supaUser.email || cleanEmail,
          role,
          role_id: userRoleId,
          role_name: userRoleName || (role === 'admin' ? 'Pemilik / Admin Utama' : role === 'teacher' ? 'Pengajar / Guru' : 'Wali Siswa'),
          teacher_id: linkedTeacherId,
          parent_id: linkedParentId,
          avatar_url: avatarUrl
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Konfigurasi Supabase tidak ditemukan.' },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Terjadi kesalahan pada server login.' },
      { status: 500 }
    );
  }
}
