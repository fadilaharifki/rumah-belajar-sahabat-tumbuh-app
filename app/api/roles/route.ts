import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { ALL_CRUD_PERMISSIONS } from '@/stores/useRoleStore';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

const MOCK_ROLES = [
  {
    id: '11111111-1111-1111-1111-000000000001',
    name: 'Pemilik / Admin Utama',
    description: 'Akses penuh tanpa batas ke seluruh modul & manajemen peran',
    permissions: ALL_CRUD_PERMISSIONS.map((p) => p.key)
  },
  {
    id: '22222222-2222-2222-2222-000000000002',
    name: 'Pengajar / Guru Pendamping',
    description: 'Bisa melihat data guru & siswa, serta menginput/update jurnal catatan sesi',
    permissions: ['guru:read', 'siswa:read', 'siswa:create', 'siswa:update', 'wali:read']
  },
  {
    id: '33333333-3333-3333-3333-000000000003',
    name: 'Wali Siswa / Orang Tua',
    description: 'Akses terbatas untuk melihat catatan hasil belajar & progress anak',
    permissions: ['siswa:read']
  },
  {
    id: '44444444-4444-4444-4444-000000000004',
    name: 'Staff Administrasi & Keuangan',
    description: 'Dapat mengelola rekap penggajian guru & data staff',
    permissions: ['guru:read', 'staff:read', 'penggajian:read', 'penggajian:export']
  }
];

// GET /api/roles - Fetch all roles and their assigned permissions
export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ data: MOCK_ROLES, source: 'mock' });
  }

  try {
    const { data: rolesData, error: rolesErr } = await supabase.from('roles').select('*').order('created_at');
    if (rolesErr || !rolesData || rolesData.length === 0) {
      return NextResponse.json({ data: MOCK_ROLES, source: 'mock' });
    }

    const { data: permsData } = await supabase.from('role_permissions').select('*');

    const formatted = rolesData.map((role) => {
      const activePerms = permsData
        ? permsData.filter((p) => p.role_id === role.id).map((p) => p.permission_key)
        : [];
      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: activePerms
      };
    });

    return NextResponse.json({ data: formatted, source: 'supabase' });
  } catch (err: any) {
    return NextResponse.json({ data: MOCK_ROLES, source: 'fallback', error: err.message });
  }
}

// POST /api/roles - Create new custom role (explicit UUID generation)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, permissions = [] } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama Peran wajib diisi!' }, { status: 400 });
    }

    const newRoleId = crypto.randomUUID ? crypto.randomUUID() : `role-${Date.now()}`;

    if (isSupabaseConfigured) {
      const { data: newRole, error: roleErr } = await supabase
        .from('roles')
        .insert([{ id: newRoleId, name, description }])
        .select()
        .single();

      if (roleErr) throw roleErr;

      if (permissions.length > 0) {
        const permRecords = permissions.map((key: string) => ({
          role_id: newRoleId,
          permission_key: key
        }));
        await supabase.from('role_permissions').insert(permRecords);
      }

      return NextResponse.json({
        success: true,
        data: { ...newRole, permissions },
        message: 'Peran kustom berhasil dibuat!'
      });
    }

    const mockRole = {
      id: newRoleId,
      name,
      description: description || 'Peran kustom buatan admin',
      permissions
    };

    return NextResponse.json({ success: true, data: mockRole, note: 'Mock mode' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
