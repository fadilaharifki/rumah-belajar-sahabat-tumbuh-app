import { create } from 'zustand';

export interface PermissionItem {
  key: string;
  label: string;
  group: string;
}

export type RolePermission = PermissionItem;

export interface RoleItem {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // List of permission keys
}

export const ALL_CRUD_PERMISSIONS: PermissionItem[] = [
  // Dashboard
  { key: 'dashboard:read', label: 'Read (Melihat Dashboard Utama)', group: 'Dashboard Utama' },

  // Presensi & AI
  { key: 'presensi:read', label: 'Read (Melihat Lembar Presensi)', group: 'Presensi & Check-In AI' },
  { key: 'presensi:create', label: 'Create (Check-In Presensi AI)', group: 'Presensi & Check-In AI' },
  { key: 'presensi:update', label: 'Update (Mengedit Status Presensi)', group: 'Presensi & Check-In AI' },
  { key: 'presensi:delete', label: 'Delete (Menghapus Data Presensi)', group: 'Presensi & Check-In AI' },

  // Jadwal Ngajar
  { key: 'jadwal:read', label: 'Read (Melihat Jadwal Ngajar)', group: 'Jadwal Ngajar & Sesi' },
  { key: 'jadwal:create', label: 'Create (Menambah Sesi Jadwal Baru)', group: 'Jadwal Ngajar & Sesi' },
  { key: 'jadwal:update', label: 'Update (Mengedit Jam & Pengajar)', group: 'Jadwal Ngajar & Sesi' },
  { key: 'jadwal:delete', label: 'Delete (Menghapus Sesi Jadwal)', group: 'Jadwal Ngajar & Sesi' },

  // Guru
  { key: 'guru:read', label: 'Read (Melihat Data Guru)', group: 'Data Guru / Pengajar' },
  { key: 'guru:create', label: 'Create (Menambah Guru Baru)', group: 'Data Guru / Pengajar' },
  { key: 'guru:update', label: 'Update (Mengedit Data Guru)', group: 'Data Guru / Pengajar' },
  { key: 'guru:delete', label: 'Delete (Menghapus Data Guru)', group: 'Data Guru / Pengajar' },

  // Siswa
  { key: 'siswa:read', label: 'Read (Melihat Data Siswa)', group: 'Data Siswa' },
  { key: 'siswa:create', label: 'Create (Menambah Siswa Baru)', group: 'Data Siswa' },
  { key: 'siswa:update', label: 'Update (Mengedit Data & Catatan Progress)', group: 'Data Siswa' },
  { key: 'siswa:delete', label: 'Delete (Menghapus Data Siswa)', group: 'Data Siswa' },

  // Wali
  { key: 'wali:read', label: 'Read (Melihat Data Wali)', group: 'Data Wali Siswa' },
  { key: 'wali:create', label: 'Create (Menambah Wali Baru)', group: 'Data Wali Siswa' },
  { key: 'wali:update', label: 'Update (Mengedit Data Wali)', group: 'Data Wali Siswa' },
  { key: 'wali:delete', label: 'Delete (Menghapus Data Wali)', group: 'Data Wali Siswa' },

  // Staff
  { key: 'staff:read', label: 'Read (Melihat Data Staff)', group: 'Data Staff Management' },
  { key: 'staff:create', label: 'Create (Menambah Staff Baru)', group: 'Data Staff Management' },
  { key: 'staff:update', label: 'Update (Mengedit Data Staff)', group: 'Data Staff Management' },
  { key: 'staff:delete', label: 'Delete (Menghapus Data Staff)', group: 'Data Staff Management' },

  // Payroll
  { key: 'penggajian:read', label: 'Read (Melihat Rekap Payroll)', group: 'Penggajian & Keuangan' },
  { key: 'penggajian:export', label: 'Export (Export Laporan PDF)', group: 'Penggajian & Keuangan' },

  // Roles & RBAC Management
  { key: 'roles:manage', label: 'Manage (Atur Role & Ability)', group: 'Manajemen Peran (RBAC)' }
];

export interface RoleStoreState {
  roles: RoleItem[];
  addRole: (role: Omit<RoleItem, 'id'>) => void;
  deleteRole: (roleId: string) => void;
  updateRolePermissions: (roleId: string, permissions: string[]) => void;
  togglePermission: (roleId: string, permissionKey: string) => void;
}

export const useRoleStore = create<RoleStoreState>((set) => ({
  roles: [
    {
      id: '11111111-1111-1111-1111-000000000001',
      name: 'Pemilik / Admin Utama',
      description: 'Akses penuh tanpa batas ke seluruh modul & manajemen peran',
      permissions: ALL_CRUD_PERMISSIONS.map((p) => p.key)
    },
    {
      id: '22222222-2222-2222-2222-000000000002',
      name: 'Pengajar / Guru Pendamping',
      description: 'Bisa melihat dashboard, presensi AI, jadwal, data guru & siswa, serta menginput jurnal catatan sesi',
      permissions: ['dashboard:read', 'presensi:read', 'presensi:create', 'jadwal:read', 'jadwal:create', 'guru:read', 'siswa:read', 'siswa:create', 'siswa:update', 'wali:read']
    },
    {
      id: '33333333-3333-3333-3333-000000000003',
      name: 'Wali Siswa / Orang Tua',
      description: 'Akses terbatas untuk melihat dashboard, jadwal & catatan hasil belajar anak',
      permissions: ['dashboard:read', 'presensi:read', 'jadwal:read', 'siswa:read']
    },
    {
      id: '44444444-4444-4444-4444-000000000004',
      name: 'Staff Administrasi & Keuangan',
      description: 'Dapat mengelola rekap penggajian guru & data staff',
      permissions: ['dashboard:read', 'guru:read', 'staff:read', 'penggajian:read', 'penggajian:export']
    }
  ],

  addRole: (newRole) => {
    const roleId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `role-${Date.now()}`;
    set((state) => ({
      roles: [...state.roles, { ...newRole, id: roleId }]
    }));
  },

  deleteRole: (roleId) => {
    set((state) => ({
      roles: state.roles.filter((r) => r.id !== roleId)
    }));
  },

  updateRolePermissions: (roleId, permissions) => {
    set((state) => ({
      roles: state.roles.map((r) =>
        r.id === roleId || (r.id === '11111111-1111-1111-1111-000000000001' && roleId === 'role-admin')
          ? { ...r, permissions }
          : r
      )
    }));
  },

  togglePermission: (roleId, permissionKey) => {
    set((state) => ({
      roles: state.roles.map((r) => {
        if (r.id !== roleId) return r;
        const exists = r.permissions.includes(permissionKey);
        const newPerms = exists
          ? r.permissions.filter((p) => p !== permissionKey)
          : [...r.permissions, permissionKey];
        return { ...r, permissions: newPerms };
      })
    }));
  }
}));
