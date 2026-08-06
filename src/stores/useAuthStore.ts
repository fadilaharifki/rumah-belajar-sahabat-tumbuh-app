import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  user: UserProfile | null;
  activeRole: 'admin' | 'teacher' | 'parent' | 'staff' | null;
  activeTeacher: Teacher | null;
  userPermissions: string[];
  setRole: (role: 'admin' | 'teacher' | 'parent' | 'staff') => void;
  setActiveTeacher: (teacher: Teacher | null) => void;
  setAuthUser: (user: UserProfile | null) => void;
  setUserPermissions: (permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      activeRole: null,
      activeTeacher: null,
      userPermissions: [],

      setRole: (role) => set({ activeRole: role }),
      setActiveTeacher: (teacher) => set({ activeTeacher: teacher }),
      setAuthUser: (user) => {
        if (!user || user.id === 'guest') {
          set({ user: null, activeRole: null, activeTeacher: null, userPermissions: [] });
        } else {
          set({
            user,
            activeRole: user.role,
            userPermissions: ALL_CRUD_PERMISSIONS.map((p) => p.key)
          });
        }
      },
      setUserPermissions: (permissions) => set({ userPermissions: permissions }),
      logout: () => set({ user: null, activeRole: null, activeTeacher: null, userPermissions: [] })
    }),
    {
      name: 'sahabat_tumbuh_auth_session', // unique key in browser localStorage
      storage: createJSONStorage(() => localStorage)
    }
  )
);
