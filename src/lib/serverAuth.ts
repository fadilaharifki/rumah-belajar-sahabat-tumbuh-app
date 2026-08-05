import { supabase } from '@/lib/supabaseClient';

export async function checkServerPermission(roleId: string, requiredPermission: string): Promise<boolean> {
  // Full access for Admin / Pemilik UUID
  if (roleId === '11111111-1111-1111-1111-000000000001' || roleId === 'role-admin' || roleId === 'admin') {
    return true;
  }

  try {
    const { data } = await supabase
      .from('role_permissions')
      .select('permission_key')
      .eq('role_id', roleId)
      .eq('permission_key', requiredPermission)
      .single();

    return Boolean(data);
  } catch {
    // Default fallback permission checks for demo mode
    if (roleId === '22222222-2222-2222-2222-000000000002' || roleId === 'teacher') {
      return ['dashboard:read', 'presensi:read', 'presensi:create', 'jadwal:read', 'guru:read', 'siswa:read', 'siswa:create', 'siswa:update', 'wali:read'].includes(requiredPermission);
    }
    if (roleId === '33333333-3333-3333-3333-000000000003' || roleId === 'parent') {
      return ['dashboard:read', 'presensi:read', 'jadwal:read', 'siswa:read'].includes(requiredPermission);
    }
    if (roleId === '44444444-4444-4444-4444-000000000004' || roleId === 'staff') {
      return ['dashboard:read', 'guru:read', 'staff:read', 'penggajian:read', 'penggajian:export'].includes(requiredPermission);
    }
    return false;
  }
}
