import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

export interface UserAccountItem {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  category: 'Pemilik' | 'Guru' | 'Staff' | 'Wali';
  role_id: string;
  role_name?: string;
  status: string;
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  full_name: string;
  phone?: string;
  category: 'Pemilik' | 'Guru' | 'Staff' | 'Wali';
  role_id: string;
}

export interface UpdateUserPayload {
  userId: string;
  role_id?: string;
  status?: string;
}

// Custom Hook for Fetching User Accounts (Fresh live fetching, staleTime = 0)
export const useUsersQuery = () => {
  return useQuery<UserAccountItem[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Gagal mengambil daftar pengguna');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
};

// Custom Hook Mutation for Creating New User in Supabase Auth & DB
export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menambahkan akun pengguna!');
      }

      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Akun Supabase Auth "${data?.full_name || 'pengguna'}" berhasil dibuat!`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mendaftarkan akun pengguna!');
    }
  });
};

// Custom Hook Mutation for Updating User Role or Active/Inactive Status
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role_id, status }: UpdateUserPayload) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id, status })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui akun pengguna!');
      }

      return { userId, role_id, status };
    },
    onSuccess: ({ status }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (status) {
        toast.info(`Status akun diperbarui menjadi "${status}"`);
      } else {
        toast.success('Peran pengguna berhasil diperbarui!');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui pengguna!');
    }
  });
};
