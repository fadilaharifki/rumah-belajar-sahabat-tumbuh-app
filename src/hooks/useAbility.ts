import { useAuthStore } from '@/stores/useAuthStore';
import { useRoleStore } from '@/stores/useRoleStore';

export type CRUDAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'manage' | 'approve' | 'bypass_schedule';
export type Resource = 'dashboard' | 'presensi' | 'jadwal' | 'guru' | 'siswa' | 'wali' | 'staff' | 'penggajian' | 'roles';

export const useAbility = () => {
  const { activeRole, user, userPermissions } = useAuthStore();
  const { roles } = useRoleStore();

  // Find exact matching role from store by UUID, name, or slug
  const matchedRole = roles.find((r) => {
    if (user?.role_id && r.id === user.role_id) return true;
    if (user?.role_name && r.name.toLowerCase().trim() === user.role_name.toLowerCase().trim()) return true;
    if (user?.role_id === '55555555-5555-5555-5555-000000000005' && r.id === '55555555-5555-5555-5555-000000000005') return true;
    if (r.id === activeRole) return true;
    if (activeRole === 'admin' && r.id === '11111111-1111-1111-1111-000000000001') return true;
    if (activeRole === 'teacher' && r.id === '22222222-2222-2222-2222-000000000002') return true;
    if (activeRole === 'parent' && r.id === '33333333-3333-3333-3333-000000000003') return true;
    return false;
  });

  const currentRole = matchedRole || (user?.role_name ? {
    id: user.role_id || '',
    name: user.role_name,
    description: '',
    permissions: userPermissions || []
  } : null);

  const isSuperAdmin =
    user?.role_id === '11111111-1111-1111-1111-000000000001' ||
    activeRole === 'admin' ||
    user?.role === 'admin';

  const can = (action: CRUDAction, resource: Resource): boolean => {
    // 1. Super Admin has unrestricted full access to all features
    if (isSuperAdmin) {
      return true;
    }

    // 2. Guru Senior special capability: can approve presensi
    if (user?.role_id === '55555555-5555-5555-5555-000000000005' || user?.role_name?.includes('Guru Senior')) {
      if (resource === 'presensi' && action === 'approve') return true;
    }

    const permissionKey = `${resource}:${action}`;

    // 2. Check strict userPermissions array fetched from /api/auth/me
    if (Array.isArray(userPermissions) && userPermissions.length > 0) {
      return userPermissions.includes(permissionKey);
    }

    // 3. Fallback check for custom roles matched by UUID in local store
    if (user?.role_id) {
      const matchRole = roles.find((r) => r.id === user.role_id);
      if (matchRole && Array.isArray(matchRole.permissions)) {
        return matchRole.permissions.includes(permissionKey);
      }
    }

    return false;
  };

  return { can, currentRole };
};
