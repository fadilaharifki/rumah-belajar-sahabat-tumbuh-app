import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

export interface TeacherItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  session_rate: number;
  photo_url?: string;
  avatar_url?: string;
  subjects: string[];
  role_id: string;
  status: string;
}

export const GURU_QUERY_KEY = ['guru'];

// Hook for fetching all Teachers with staleTime: 0
export function useGuruQuery() {
  return useQuery<TeacherItem[]>({
    queryKey: GURU_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/guru');
      if (!res.ok) throw new Error('Gagal mengambil data guru');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for fetching full detail of a specific teacher (Attendance, Murid Bimbingan, Payroll)
export function useGuruDetailQuery(id: string, month: string) {
  return useQuery({
    queryKey: ['guru-detail', id, month],
    queryFn: async () => {
      const res = await fetch(`/api/guru/${id}/detail?month=${month}`);
      if (!res.ok) throw new Error('Gagal mengambil detail guru');
      return res.json();
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for updating Payroll Status / Amount for a Teacher & Period
export function useUpdatePayrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      teacher_id: string;
      period_month: string;
      total_sessions?: number;
      rate_per_session?: number;
      total_amount?: number;
      status: 'Lunas' | 'Pending' | 'Draft';
    }) => {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui status payroll');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      toast.success(data?.message || 'Status Payroll berhasil diperbarui!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui status payroll!');
    }
  });
}

// Hook for adding a new Teacher with Toast Notifications
export function useCreateGuruMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newGuru: {
      name: string;
      email: string;
      phone: string;
      session_rate?: number;
      photo_url?: string;
      avatar_url?: string;
      subjects?: string[];
    }) => {
      const res = await fetch('/api/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGuru)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat data guru baru');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GURU_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data?.message || 'Data guru baru & akun pengguna berhasil dibuat!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan data guru baru!');
    }
  });
}

// Hook for updating Teacher details / status / resetting password with Toast Notifications
export function useUpdateGuruMutation() {
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
      session_rate?: number;
      photo_url?: string;
      avatar_url?: string;
      subjects?: string[];
      status?: string;
      reset_password?: boolean;
    }) => {
      const res = await fetch(`/api/guru/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui data guru');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: GURU_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (variables.reset_password) {
        toast.warning(data?.message || 'Password guru berhasil di-reset!');
      } else if (variables.status) {
        toast.info(data?.message || `Status akun guru diubah menjadi ${variables.status}`);
      } else {
        toast.success(data?.message || 'Data guru berhasil diperbarui!');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui data guru!');
    }
  });
}

// Hook for deleting Teacher with Toast Notifications
export function useDeleteGuruMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/guru/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus data guru');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GURU_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.error(data?.message || 'Data guru & akun pengguna berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus data guru!');
    }
  });
}
