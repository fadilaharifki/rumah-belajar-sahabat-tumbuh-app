import { NextResponse } from 'next/server';
import { getGuaranteedUniqueEmail } from '@/utils/emailUtils';
import { supabase, supabaseAuthAdmin } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

const WALI_ROLE_ID = '33333333-3333-3333-3333-000000000003';

// GET /api/wali - Fetch all parents joined with children count & public.users avatar/status
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { data: parents, error } = await supabase
      .from('parents')
      .select('*, students(id, name), users(status, role_id, avatar_url)')
      .order('name');

    if (error) {
      console.warn('Supabase wali query error:', error.message);
      return NextResponse.json({ data: [], source: 'error', error: error.message });
    }

    const formatted = (parents || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      email: p.email,
      address: p.address || 'Alamat belum diisi',
      avatar_url: p.avatar_url || p.users?.avatar_url || '',
      children_count: Array.isArray(p.students) ? p.students.length : 0,
      children_names: Array.isArray(p.students) ? p.students.map((st: any) => st.name) : [],
      role_id: p.users?.role_id || p.user_id || WALI_ROLE_ID,
      status: p.users?.status || 'Aktif'
    }));

    return NextResponse.json({ data: formatted, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ data: [], source: 'fallback', error: err.message });
  }
}

// POST /api/wali - Create a new parent (Wali) using RPC reset_user_password (Zero session hijacking!)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, address, avatar_url } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Nama Wali dan No. HP wajib diisi!' },
        { status: 400 }
      );
    }

    const targetEmail = await getGuaranteedUniqueEmail(email, name, 'wali');
    const randomPassword = `Wli${Math.random().toString(36).slice(-6)}!`;

    if (isSupabaseConfigured) {
      // 1. Upsert into public.users table
      const userRecord = {
        email: targetEmail,
        full_name: name,
        phone,
        avatar_url: avatar_url || '',
        category: 'Wali',
        role_id: WALI_ROLE_ID,
        status: 'Aktif'
      };

      const { data: dbUser, error: dbUserError } = await supabase
        .from('users')
        .upsert([userRecord], { onConflict: 'email' })
        .select()
        .single();

      if (dbUserError) {
        console.warn('public.users upsert warning for wali:', dbUserError.message);
      }

      const userId = dbUser?.id || null;

      // 2. Insert into public.parents table
      const newParent = {
        user_id: userId,
        name,
        phone,
        email: targetEmail,
        address: address || 'Alamat belum diisi',
        avatar_url: avatar_url || ''
      };

      let { data, error: parentError } = await supabase
        .from('parents')
        .insert([newParent])
        .select()
        .single();

      // Fallback if avatar_url column is not yet created in public.parents schema
      if (parentError && parentError.message?.includes('avatar_url')) {
        delete (newParent as any).avatar_url;
        const fallback = await supabase
          .from('parents')
          .insert([newParent])
          .select()
          .single();
        data = fallback.data;
        parentError = fallback.error;
      }

      if (parentError) throw parentError;

      // 3. Create active confirmed account in auth.users via RPC (Zero session mutation!)
      await supabase.rpc('reset_user_password', {
        target_email: targetEmail,
        new_password: randomPassword
      });

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          avatar_url: data.avatar_url,
          children_count: 0,
          children_names: [],
          role_id: WALI_ROLE_ID,
          status: 'Aktif',
          generated_password: randomPassword
        },
        message: `Wali baru & akun pengguna otomatis dibuat! Password: ${randomPassword}`
      });
    }

    const mockWali = {
      id: `parent-${Date.now()}`,
      name,
      phone,
      email: targetEmail,
      address: address || 'Alamat belum diisi',
      avatar_url: avatar_url || '',
      children_count: 0,
      children_names: [],
      role_id: WALI_ROLE_ID,
      status: 'Aktif',
      generated_password: randomPassword
    };

    return NextResponse.json({ success: true, data: mockWali, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/wali - Bulk delete parents by array of IDs { ids: string[] }
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Daftar ID wali wajib diisi!' }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      // Fetch parents to get user_ids or emails for cascading deletion
      const { data: parentsToDelete } = await supabase
        .from('parents')
        .select('id, user_id, email')
        .in('id', ids);

      const userIds = (parentsToDelete || []).map((p) => p.user_id).filter(Boolean);
      const emails = (parentsToDelete || []).map((p) => p.email).filter(Boolean);

      const { error } = await supabase.from('parents').delete().in('id', ids);
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
      message: `${ids.length} data wali berhasil dihapus.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
