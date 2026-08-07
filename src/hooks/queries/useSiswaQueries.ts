import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

export interface StudentItem {
  id: string;
  name: string;
  nickname: string;
  grade: string;
  parent_id: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  notes: string;
  avatar_url?: string;
}

export const SISWA_QUERY_KEY = ['siswa'];

// Hook for fetching all Siswa (Students) with staleTime: 0
export function useSiswaQuery() {
  return useQuery<StudentItem[]>({
    queryKey: SISWA_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/siswa');
      if (!res.ok) throw new Error('Gagal mengambil data siswa');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for Infinite Scroll loading of Siswa via TanStack Query
export function useInfiniteSiswaQuery(pageSize = 6) {
  return useInfiniteQuery({
    queryKey: ['siswa-infinite', pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/siswa?page=${pageParam}&limit=${pageSize}`);
      if (!res.ok) throw new Error('Gagal mengambil data siswa');
      const json = await res.json();
      const items: StudentItem[] = json.data || [];
      return {
        items,
        page: pageParam as number,
        hasMore: items.length >= pageSize
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    },
    staleTime: 0
  });
}

// Hook for fetching full detail of a specific student (Profile, Session Logs, Attendance, Schedules)
export function useSiswaDetailQuery(id: string) {
  return useQuery({
    queryKey: ['siswa-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/siswa/${id}/detail`);
      if (!res.ok) throw new Error('Gagal mengambil detail data siswa');
      return res.json();
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for adding a new Siswa (Supports existing parent_id OR creating new_parent on the fly)
export function useCreateSiswaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newSiswa: {
      name: string;
      nickname?: string;
      grade: string;
      parent_id?: string;
      new_parent_name?: string;
      new_parent_phone?: string;
      notes?: string;
      avatar_url?: string;
    }) => {
      const res = await fetch('/api/siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSiswa)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal membuat data siswa baru');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SISWA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['siswa-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['siswa-detail'] });
      queryClient.invalidateQueries({ queryKey: ['wali'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(data?.message || 'Data siswa baru berhasil ditambahkan!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan data siswa baru!');
    }
  });
}

// Hook for updating Siswa details with Toast Notifications
export function useUpdateSiswaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      nickname?: string;
      grade?: string;
      parent_id?: string;
      notes?: string;
      avatar_url?: string;
    }) => {
      const res = await fetch(`/api/siswa/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui data siswa');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SISWA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['siswa-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['siswa-detail'] });
      queryClient.invalidateQueries({ queryKey: ['wali'] });
      toast.success(data?.message || 'Data siswa berhasil diperbarui!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui data siswa!');
    }
  });
}

// Hook for deleting Siswa with Toast Notifications
export function useDeleteSiswaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/siswa/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus data siswa');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SISWA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['siswa-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['siswa-detail'] });
      toast.error(data?.message || 'Data siswa berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus data siswa!');
    }
  });
}

// Hook for bulk deleting Siswa by array of IDs
export function useBulkDeleteSiswaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/siswa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus data siswa terpilih.');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SISWA_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['siswa-infinite'] });
      toast.error(data?.message || 'Data siswa terpilih berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus data siswa terpilih!');
    }
  });
}
