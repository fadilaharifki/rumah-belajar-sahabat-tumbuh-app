import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

export interface ManagementStaffItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url?: string;
  role_title?: string;
  role_name: string;
  role_id: string;
  status: string;
}

export const STAFF_QUERY_KEY = ['staff'];

// Hook for fetching all Staff Management members with staleTime: 0
export function useStaffQuery() {
  return useQuery<ManagementStaffItem[]>({
    queryKey: STAFF_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/staff');
      if (!res.ok) throw new Error('Gagal mengambil data staff');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for creating a new Staff member with Toast Notifications
export function useCreateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newStaff: {
      name: string;
      email: string;
      phone: string;
      avatar_url?: string;
      role_title?: string;
      role_id?: string;
    }) => {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambahkan staff baru');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data?.message || 'Staff baru & akun pengguna berhasil dibuat!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan staff baru!');
    }
  });
}

// Hook for updating Staff details / status / resetting password with Toast Notifications
export function useUpdateStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      avatar_url?: string;
      role_title?: string;
      status?: string;
      reset_password?: boolean;
    }) => {
      const res = await fetch(`/api/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui data staff');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (variables.reset_password) {
        toast.warning(data?.message || 'Password staff berhasil di-reset!');
      } else if (variables.status) {
        toast.info(data?.message || `Status akun staff diubah menjadi ${variables.status}`);
      } else {
        toast.success(data?.message || 'Data staff berhasil diperbarui!');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui data staff!');
    }
  });
}

// Hook for deleting Staff member with Toast Notifications
export function useDeleteStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus data staff');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.error(data?.message || 'Data staff & akun pengguna berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus data staff!');
    }
  });
}

// Hook for bulk deleting Staff members by array of IDs
export function useBulkDeleteStaffMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus data staff terpilih.');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.error(data?.message || 'Data staff terpilih berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus data staff terpilih!');
    }
  });
}
