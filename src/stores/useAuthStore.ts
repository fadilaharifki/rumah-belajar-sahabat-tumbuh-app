import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { INITIAL_TEACHERS } from '@/utils/seedData';
import { Teacher } from '@/hooks/useMasterData';
import { ALL_CRUD_PERMISSIONS } from './useRoleStore';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'parent' | 'staff';
  role_id?: string;
  teacher_id?: string;
  parent_id?: string;
  avatar_url?: string;
}

export interface AuthState {
  user: UserProfile;
  activeRole: 'admin' | 'teacher' | 'parent' | 'staff';
  activeTeacher: Teacher;
  userPermissions: string[];
  setRole: (role: 'admin' | 'teacher' | 'parent' | 'staff') => void;
  setActiveTeacher: (teacher: Teacher) => void;
  setAuthUser: (user: UserProfile) => void;
  setUserPermissions: (permissions: string[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: "admin-1",
        full_name: "Ibu Nurul (Pemilik / Admin)",
        email: "pemilik@sahabattumbuh.id",
        role: "admin",
        role_id: "11111111-1111-1111-1111-000000000001",
        avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80"
      },
      activeRole: "admin",
      activeTeacher: INITIAL_TEACHERS[0] as Teacher,
      userPermissions: ALL_CRUD_PERMISSIONS.map((p) => p.key),

      setRole: (role) => set({ activeRole: role }),
      setActiveTeacher: (teacher) => set({ activeTeacher: teacher }),
      setAuthUser: (user) => set({ user, activeRole: user.role }),
      setUserPermissions: (permissions) => set({ userPermissions: permissions })
    }),
    {
      name: 'sahabat_tumbuh_auth_session', // unique key in browser localStorage
      storage: createJSONStorage(() => localStorage)
    }
  )
);
