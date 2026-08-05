import { NextResponse } from 'next/server';
import { supabase, createIsolatedClient } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

const DEFAULT_ADMIN_ROLE_UUID = '11111111-1111-1111-1111-000000000001';
const DEFAULT_TEACHER_ROLE_UUID = '22222222-2222-2222-2222-000000000002';
const DEFAULT_PARENT_ROLE_UUID = '33333333-3333-3333-3333-000000000003';
const DEFAULT_STAFF_ROLE_UUID = '44444444-4444-4444-4444-000000000004';

// GET /api/auth/me - Fetch user profile & permissions per browser session (Zero cross-browser leaks!)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paramEmail = searchParams.get('email')?.toLowerCase().trim();

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        user: {
          id: 'admin-1',
          full_name: 'Ibu Nurul (Pemilik / Admin)',
          email: paramEmail || 'pemilik@sahabattumbuh.id',
          role: paramEmail?.includes('wali') ? 'parent' : paramEmail?.includes('guru') ? 'teacher' : 'admin',
          role_id: DEFAULT_ADMIN_ROLE_UUID,
          avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80'
        },
        permissions: ['ALL_ACCESS']
      });
    }

    // Query user profile by email if provided from client's isolated session
    let dbUser: any = null;
    let supaEmail = paramEmail;

    if (paramEmail) {
      const { data } = await supabase
        .from('users')
        .select('*, roles(*)')
        .eq('email', paramEmail)
        .maybeSingle();

      dbUser = data;
    }

    // Default fallback values
    let roleId = dbUser?.role_id || DEFAULT_ADMIN_ROLE_UUID;
    let fullName = dbUser?.full_name || supaEmail || 'Pengguna Sahabat Tumbuh';
    let avatarUrl = dbUser?.avatar_url || '';
    let category = dbUser?.category || 'Pemilik';

    // Resolve linked Teacher ID or Parent ID if applicable
    let teacherId: string | undefined = undefined;
    let parentId: string | undefined = undefined;

    if (supaEmail) {
      const [{ data: teacherData }, { data: parentData }] = await Promise.all([
        supabase.from('teachers').select('id').eq('email', supaEmail).maybeSingle(),
        supabase.from('parents').select('id').eq('email', supaEmail).maybeSingle()
      ]);

      if (teacherData) teacherId = teacherData.id;
      if (parentData) parentId = parentData.id;
    }

    // Determine user role string
    let roleStr: 'admin' | 'staff' | 'teacher' | 'parent' = 'admin';
    if (roleId === DEFAULT_ADMIN_ROLE_UUID || category === 'Pemilik') roleStr = 'admin';
    else if (roleId === DEFAULT_STAFF_ROLE_UUID || category === 'Staff') roleStr = 'staff';
    else if (roleId === DEFAULT_PARENT_ROLE_UUID || category === 'Wali') roleStr = 'parent';
    else if (roleId === DEFAULT_TEACHER_ROLE_UUID || category === 'Guru') roleStr = 'teacher';

    // Fetch active permissions for this role
    const { data: rolePerms } = await supabase
      .from('role_permissions')
      .select('permission_key')
      .eq('role_id', roleId);

    const permissions = rolePerms ? rolePerms.map((rp) => rp.permission_key) : ['ALL_ACCESS'];

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser?.auth_user_id || dbUser?.id || `usr-${Date.now()}`,
        full_name: fullName,
        email: supaEmail || 'pemilik@sahabattumbuh.id',
        role: roleStr,
        role_id: roleId,
        teacher_id: teacherId,
        parent_id: parentId,
        avatar_url: avatarUrl
      },
      permissions
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
