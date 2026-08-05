import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

export interface WaliItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  avatar_url?: string;
  studentCount: number;
  role_id: string;
  status: string;
}

export const WALI_QUERY_KEY = ['wali'];

// Hook for fetching all Wali (Parents) with staleTime: 0
export function useWaliQuery() {
  return useQuery<WaliItem[]>({
    queryKey: WALI_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/wali');
      if (!res.ok) throw new Error('Gagal mengambil data wali siswa');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for adding a new Wali with Toast Notifications
export function useCreateWaliMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newWali: { name: string; phone: string; email?: string; address?: string; avatar_url?: string }) => {
      const res = await fetch('/api/wali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWali)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat data wali siswa');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: WALI_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data?.message || 'Data wali siswa baru berhasil ditambahkan!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan wali siswa baru!');
    }
  });
}

// Hook for updating Wali / resetting password / toggling status with Toast Notifications
export function useUpdateWaliMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; name?: string; phone?: string; email?: string; address?: string; avatar_url?: string; status?: string; reset_password?: boolean }) => {
      const res = await fetch(`/api/wali/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengedit data wali siswa');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: WALI_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (variables.reset_password) {
        toast.warning(data?.message || 'Password wali siswa berhasil di-reset!');
      } else if (variables.status) {
        toast.info(data?.message || `Status akun wali berhasil diubah menjadi ${variables.status}`);
      } else {
        toast.success(data?.message || 'Data wali siswa berhasil diperbarui!');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui data wali siswa!');
    }
  });
}

// Hook for deleting Wali & associated user account with Toast Notifications
export function useDeleteWaliMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/wali/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus data wali siswa');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: WALI_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.error(data?.message || 'Data wali siswa & akun pengguna berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus data wali siswa!');
    }
  });
}
