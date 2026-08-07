import { NextResponse } from 'next/server';
import { getGuaranteedUniqueEmail } from '@/utils/emailUtils';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

const GURU_ROLE_ID = '22222222-2222-2222-2222-000000000002';

// GET /api/guru - Fetch all teachers joined with public.users status & avatar
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('*, users(status, role_id, avatar_url)')
      .order('name');

    if (error) {
      console.warn('Supabase guru query error:', error.message);
      return NextResponse.json({ data: [], source: 'error', error: error.message });
    }

    const formatted = (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      session_rate: t.session_rate || 85000,
      photo_url: t.photo_url || t.users?.avatar_url || '',
      avatar_url: t.photo_url || t.users?.avatar_url || '',
      subjects: t.subjects || ['Umum', 'Pendampingan'],
      role_id: t.users?.role_id || t.user_id || GURU_ROLE_ID,
      status: t.users?.status || t.status || 'Aktif'
    }));

    return NextResponse.json({ data: formatted, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ data: [], source: 'fallback', error: err.message });
  }
}

// POST /api/guru - Create a new teacher using RPC reset_user_password (Zero session hijacking!)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, session_rate, photo_url, avatar_url, subjects } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Nama Guru, Email, dan No. HP wajib diisi!' },
        { status: 400 }
      );
    }

    const targetPhoto = photo_url || avatar_url || '';
    const cleanEmail = await getGuaranteedUniqueEmail(email, name, 'guru');
    const randomPassword = `Gru${Math.random().toString(36).slice(-6)}!`;

    if (isSupabaseConfigured) {
      // 1. Upsert into public.users table
      const userRecord = {
        email: cleanEmail,
        full_name: name,
        phone,
        avatar_url: targetPhoto,
        category: 'Guru',
        role_id: GURU_ROLE_ID,
        status: 'Aktif'
      };

      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .upsert([userRecord], { onConflict: 'email' })
        .select()
        .single();

      if (dbUserError) {
        console.warn('public.users upsert warning for guru:', dbUserError.message);
      }

      const userId = dbUser?.id || null;

      // 2. Insert into public.teachers table
      const newTeacher = {
        user_id: userId,
        name,
        email: cleanEmail,
        phone,
        session_rate: session_rate || 85000,
        photo_url: targetPhoto,
        subjects: subjects || ['Umum', 'Pendampingan'],
        status: 'Aktif'
      };

      const { data, error: teacherError } = await supabase
        .from('teachers')
        .insert([newTeacher])
        .select()
        .single();

      if (teacherError) throw teacherError;

      // 3. Create active confirmed account in auth.users via RPC (Zero session mutation!)
      await supabase.rpc('reset_user_password', {
        target_email: cleanEmail,
        new_password: randomPassword
      });

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          session_rate: data.session_rate,
          photo_url: data.photo_url,
          avatar_url: data.photo_url,
          subjects: data.subjects,
          role_id: GURU_ROLE_ID,
          status: 'Aktif',
          generated_password: randomPassword
        },
        message: `Guru baru & akun pengguna otomatis dibuat! Password: ${randomPassword}`
      });
    }

    const mockTeacher = {
      id: `teacher-${Date.now()}`,
      name,
      email: cleanEmail,
      phone,
      session_rate: session_rate || 85000,
      photo_url: targetPhoto,
      avatar_url: targetPhoto,
      subjects: subjects || ['Umum', 'Pendampingan'],
      role_id: GURU_ROLE_ID,
      status: 'Aktif',
      generated_password: randomPassword
    };

    return NextResponse.json({ success: true, data: mockTeacher, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/guru - Bulk delete teachers by array of IDs { ids: string[] }
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Daftar ID guru wajib diisi!' }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      // Fetch teachers to get user_ids or emails for cascading deletion
      const { data: teachersToDelete } = await supabase
        .from('teachers')
        .select('id, user_id, email')
        .in('id', ids);

      const userIds = (teachersToDelete || []).map((t) => t.user_id).filter(Boolean);
      const emails = (teachersToDelete || []).map((t) => t.email).filter(Boolean);

      const { error } = await supabase.from('teachers').delete().in('id', ids);
      if (error) throw error;

      if (userIds.length > 0) {
        await supabase.from('users').delete().in('id', userIds);
      }
      if (emails.length > 0) {
        await supabase.from('users').delete().in('email', emails);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} data guru berhasil dihapus.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
