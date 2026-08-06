import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useRoleStore } from '@/stores/useRoleStore';
import { useLoginMutation, useLogoutMutation } from '@/hooks/queries/useAuthQueries';

export const useAuth = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, activeRole, setRole, setAuthUser, setUserPermissions } = useAuthStore();
  const { updateRolePermissions } = useRoleStore();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  // Real-time Role & Permissions Synchronization on Mount for current browser session
  useEffect(() => {
    let isMounted = true;

    const syncUserRoleAndPermissions = async () => {
      try {
        const currentEmail = user?.email;
        if (!currentEmail) return;

        const res = await fetch(`/api/auth/me?email=${encodeURIComponent(currentEmail)}`);

        // Automatic Redirect to Login on 401 Unauthorized Session Expired
        if (res.status === 401) {
          if (pathname !== '/login' && isMounted) {
            router.push('/login');
          }
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user && isMounted) {
            setAuthUser(data.user);
            if (data.permissions) {
              setUserPermissions(data.permissions);
              if (data.user.role_id) {
                updateRolePermissions(data.user.role_id, data.permissions);
              }
            }
          }
        }
      } catch {
        // ignore sync error
      }
    };

    syncUserRoleAndPermissions();

    return () => {
      isMounted = false;
    };
  }, [pathname, router, setAuthUser, setUserPermissions, updateRolePermissions, user?.email]);

  const signInWithEmail = async (email: string, password?: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const signOut = async () => {
    return logoutMutation.mutateAsync();
  };

  return {
    user,
    activeRole,
    setRole,
    signInWithEmail,
    loginMutation,
    logoutMutation,
    signOut
  };
};
