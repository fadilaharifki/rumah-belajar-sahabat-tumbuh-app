import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

const STAFF_ROLE_ID = '44444444-4444-4444-4444-000000000004';

// GET /api/staff - Fetch all staff members joined with public.users status & avatar
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*, users(status, role_id, avatar_url)')
      .order('name');

    if (error) {
      console.warn('Supabase staff query error:', error.message);
      return NextResponse.json({ data: [], source: 'error', error: error.message });
    }

    const formatted = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      avatar_url: s.avatar_url || s.users?.avatar_url || '',
      role_title: s.role_title || 'Staff Operasional',
      role_id: s.users?.role_id || s.user_id || STAFF_ROLE_ID,
      status: s.users?.status || 'Aktif'
    }));

    return NextResponse.json({ data: formatted, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ data: [], source: 'fallback', error: err.message });
  }
}

// POST /api/staff - Create a new staff member using RPC reset_user_password (Zero session hijacking!)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, avatar_url, role_title } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Nama Staff, Email, dan No. HP wajib diisi!' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const randomPassword = `Stf${Math.random().toString(36).slice(-6)}!`;

    if (isSupabaseConfigured) {
      // 1. Upsert into public.users table
      const userRecord = {
        email: cleanEmail,
        full_name: name,
        phone,
        avatar_url: avatar_url || '',
        category: 'Staff',
        role_id: STAFF_ROLE_ID,
        status: 'Aktif'
      };

      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .upsert([userRecord], { onConflict: 'email' })
        .select()
        .single();

      if (dbUserError) {
        console.warn('public.users upsert warning for staff:', dbUserError.message);
      }

      const userId = dbUser?.id || null;

      // 2. Insert into public.staff table
      const newStaff = {
        user_id: userId,
        name,
        email: cleanEmail,
        phone,
        avatar_url: avatar_url || '',
        role_title: role_title || 'Staff Operasional'
      };

      let { data, error: staffError } = await supabase
        .from('staff')
        .insert([newStaff])
        .select()
        .single();

      // Fallback if avatar_url column is not yet created in public.staff schema
      if (staffError && staffError.message?.includes('avatar_url')) {
        delete (newStaff as any).avatar_url;
        const fallback = await supabase
          .from('staff')
          .insert([newStaff])
          .select()
          .single();
        data = fallback.data;
        staffError = fallback.error;
      }

      if (staffError) throw staffError;

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
          avatar_url: data.avatar_url,
          role_title: data.role_title,
          role_id: STAFF_ROLE_ID,
          status: 'Aktif',
          generated_password: randomPassword
        },
        message: `Staff baru & akun pengguna otomatis dibuat! Password: ${randomPassword}`
      });
    }

    const mockStaff = {
      id: `staff-${Date.now()}`,
      name,
      email: cleanEmail,
      phone,
      avatar_url: avatar_url || '',
      role_title: role_title || 'Staff Operasional',
      role_id: STAFF_ROLE_ID,
      status: 'Aktif',
      generated_password: randomPassword
    };

    return NextResponse.json({ success: true, data: mockStaff, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
