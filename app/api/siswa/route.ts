import { NextResponse } from 'next/server';
import { getGuaranteedUniqueEmail } from '@/utils/emailUtils';
import { supabase, supabaseAuthAdmin } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

const WALI_ROLE_ID = '33333333-3333-3333-3333-000000000003';

// GET /api/siswa - Fetch students with optional page & limit for Infinite Scroll
export async function GET(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: [], source: 'mock' });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 0;
    const limit = Number(searchParams.get('limit')) || 0;

    let query = supabase
      .from('students')
      .select('*, parents(id, name, phone, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (page > 0 && limit > 0) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      console.warn('Supabase students query error:', error.message);
      return NextResponse.json({ data: [], source: 'error', error: error.message });
    }

    const formattedStudents = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      nickname: s.nickname || s.name.split(' ')[0],
      grade: s.grade,
      parent_id: s.parent_id,
      parent_name: s.parents?.name || 'Belum Dihubungkan',
      parent_phone: s.parents?.phone || '-',
      parent_email: s.parents?.email || '-',
      notes: s.notes || '-',
      avatar_url: s.avatar_url || s.photo_url || ''
    }));

    return NextResponse.json({
      data: formattedStudents,
      totalCount: count || formattedStudents.length,
      page,
      limit,
      source: 'supabase'
    });
  } catch (err: any) {
    return NextResponse.json({ data: [], source: 'fallback', error: err.message });
  }
}

// POST /api/siswa - Create a new student (Supports existing parent_id OR creating new_parent on the fly!)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, nickname, grade, parent_id, new_parent_name, new_parent_phone, notes, avatar_url } = body;

    if (!name || !grade) {
      return NextResponse.json(
        { success: false, error: 'Nama Siswa dan Kelas/Jenjang wajib diisi!' },
        { status: 400 }
      );
    }

    let targetParentId = parent_id;
    let generatedPassword = null;
    let parentEmail = null;

    if (isSupabaseConfigured) {
      // 1. If new_parent details are passed, create parent record & Supabase auth account first
      if (new_parent_name && new_parent_phone) {
        const targetEmail = await getGuaranteedUniqueEmail(null, name, 'wali');
        const randomPassword = `Wli${Math.random().toString(36).slice(-6)}!`;

        const { data: authData } = await supabaseAuthAdmin.auth.signUp({
          email: targetEmail,
          password: randomPassword,
          options: {
            data: {
              full_name: new_parent_name,
              category: 'Wali',
              role_id: WALI_ROLE_ID
            }
          }
        });

        const { data: dbUser } = await supabase
          .from('users')
          .upsert([{
            auth_user_id: authData?.user?.id || null,
            email: targetEmail,
            full_name: new_parent_name,
            phone: new_parent_phone,
            category: 'Wali',
            role_id: WALI_ROLE_ID,
            status: 'Aktif'
          }], { onConflict: 'email' })
          .select()
          .single();

        const { data: createdParent, error: parentErr } = await supabase
          .from('parents')
          .insert([{
            user_id: dbUser?.id || null,
            name: new_parent_name,
            phone: new_parent_phone,
            email: targetEmail,
            address: 'Alamat Belum Diisi'
          }])
          .select()
          .single();

        if (parentErr) throw parentErr;

        targetParentId = createdParent.id;
        generatedPassword = randomPassword;
        parentEmail = targetEmail;
      }

      if (!targetParentId) {
        return NextResponse.json(
          { success: false, error: 'Wali Siswa wajib dipilih atau diisi!' },
          { status: 400 }
        );
      }

      // 2. Insert student linked to targetParentId
      const newStudent: Record<string, any> = {
        name,
        nickname: nickname || name.split(' ')[0],
        grade,
        parent_id: targetParentId,
        notes: notes || 'Belajar dengan semangat',
        avatar_url: avatar_url || ''
      };

      let { data, error } = await supabase
        .from('students')
        .insert([newStudent])
        .select('*, parents(id, name, phone, email)')
        .single();

      // Fallback if avatar_url column in public.students is named photo_url in legacy DB
      if (error && error.message?.includes('avatar_url')) {
        delete newStudent.avatar_url;
        newStudent.photo_url = avatar_url || '';
        const fallback = await supabase
          .from('students')
          .insert([newStudent])
          .select('*, parents(id, name, phone, email)')
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          name: data.name,
          nickname: data.nickname,
          grade: data.grade,
          parent_id: data.parent_id,
          parent_name: data.parents?.name || 'Orang Tua / Wali',
          parent_phone: data.parents?.phone || '-',
          parent_email: data.parents?.email || '-',
          notes: data.notes,
          avatar_url: data.avatar_url || data.photo_url || '',
          generated_password: generatedPassword,
          parent_account_email: parentEmail
        },
        message: generatedPassword
          ? `Siswa & Wali baru berhasil dibuat bersamaan! Password wali: ${generatedPassword}`
          : 'Data siswa baru berhasil ditambahkan!'
      });
    }

    const mockStudent = {
      id: `std-${Date.now()}`,
      name,
      nickname: nickname || name.split(' ')[0],
      grade,
      parent_id: targetParentId || 'mock-parent',
      parent_name: new_parent_name || 'Orang Tua / Wali',
      parent_phone: new_parent_phone || '081987654321',
      parent_email: 'parent@gmail.com',
      notes: notes || 'Belajar dengan semangat',
      avatar_url: avatar_url || ''
    };

    return NextResponse.json({ success: true, data: mockStudent, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/siswa - Bulk delete students by array of IDs { ids: string[] }
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Daftar ID siswa wajib diisi!' }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('students').delete().in('id', ids);
      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: `${ids.length} data siswa berhasil dihapus.`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
