import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore, UserProfile } from '@/stores/useAuthStore';
import { toast } from '@/stores/useToastStore';

export interface LoginPayload {
  email: string;
  password?: string;
}

// Custom TanStack Query Hook for Login Mutation
export const useLoginMutation = () => {
  const router = useRouter();
  const { setAuthUser } = useAuthStore();

  return useMutation({
    mutationFn: async ({ email, password }: LoginPayload) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal masuk ke aplikasi!');
      }

      return data.user as UserProfile;
    },
    onSuccess: (user) => {
      setAuthUser(user);
      toast.success(`Selamat datang kembali, ${user.full_name}!`);
      router.push('/');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Email atau kata sandi tidak valid!');
    }
  });
};

// Custom TanStack Query Hook for Logout Mutation
export const useLogoutMutation = () => {
  const router = useRouter();
  const { setAuthUser } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return res.json();
    },
    onSuccess: () => {
      setAuthUser({
        id: 'guest',
        full_name: 'Tamu / Belum Login',
        email: '',
        role: 'parent'
      });
      toast.info('Anda telah keluar dari aplikasi.');
      router.push('/login');
    }
  });
};
