import { NextResponse } from 'next/server';
import { supabase, supabaseAuthAdmin } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// GET /api/users - Fetch users from public.users with optional category/role_id filter
export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const roleId = searchParams.get('role_id');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const isAscending = searchParams.get('sort_order') === 'asc';

    let dbSortColumn = 'created_at';
    if (sortBy === 'full_name' || sortBy === 'name') dbSortColumn = 'full_name';
    else if (sortBy === 'email') dbSortColumn = 'email';
    else if (sortBy === 'category') dbSortColumn = 'category';
    else if (sortBy === 'status') dbSortColumn = 'status';
    else if (sortBy === 'created_at') dbSortColumn = 'created_at';

    let query = supabase
      .from('users')
      .select('*, roles(name)')
      .order(dbSortColumn, { ascending: isAscending });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (roleId && roleId !== 'all') {
      query = query.eq('role_id', roleId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase users query error:', error.message);
      return NextResponse.json({ data: [], source: 'error', error: error.message });
    }

    const formatted = (data || []).map((u: any) => {
      const name = u.full_name || u.name || (u.email ? u.email.split('@')[0] : 'Pengguna');
      return {
        id: u.id,
        name: name,
        full_name: name,
        email: u.email,
        phone: u.phone,
        avatar_url: u.avatar_url || '',
        category: u.category || 'Pengguna',
        role_id: u.role_id,
        role_name: u.roles?.name || u.category || 'Pengguna System',
        status: u.status || 'Aktif',
        created_at: u.created_at
      };
    });

    return NextResponse.json({ data: formatted, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ data: [], source: 'fallback', error: err.message });
  }
}

// POST /api/users - Register new user using isolated supabaseAuthAdmin client
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, email, phone, category = 'Guru', role_id = '22222222-2222-2222-2222-000000000002', status = 'Aktif' } = body;

    if (!email || !full_name) {
      return NextResponse.json({ success: false, error: 'Email dan Nama Lengkap wajib diisi!' }, { status: 400 });
    }

    let authUserId: string | null = null;
    const randomPassword = `Usr${Math.random().toString(36).slice(-6)}!`;

    if (isSupabaseConfigured) {
      // 1. Create Supabase Auth account with isolated client (persistSession: false)
      const { data: authData, error: authError } = await supabaseAuthAdmin.auth.signUp({
        email,
        password: randomPassword,
        options: {
          data: {
            full_name,
            category,
            role_id
          }
        }
      });

      if (authError) {
        console.warn('Supabase Auth signUp note:', authError.message);
      }

      authUserId = authData?.user?.id || null;

      // 2. Insert into public.users table
      const userRecord = {
        auth_user_id: authUserId,
        email,
        full_name,
        phone,
        category,
        role_id,
        status
      };

      const { data, error } = await supabase
        .from('users')
        .upsert([userRecord], { onConflict: 'email' })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: { ...data, generated_password: randomPassword },
        message: 'Pengguna baru & akun Supabase Auth berhasil dibuat!'
      });
    }

    const mockUser = {
      id: `user-${Date.now()}`,
      full_name,
      email,
      phone,
      category,
      role_id,
      status,
      generated_password: randomPassword
    };

    return NextResponse.json({ success: true, data: mockUser, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
