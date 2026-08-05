import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

export interface PresensiItem {
  id: string;
  schedule_id?: string;
  teacher_id: string;
  teacher_name: string;
  teacher_photo?: string;
  student_id: string;
  student_name: string;
  student_grade: string;
  student_avatar?: string;
  date: string;
  check_in: string;
  check_out?: string;
  duration_minutes?: number;
  status: 'CheckIn' | 'Valid' | 'ManualVerified';
  session_log?: {
    id: string;
    session_number: number;
    activities: string;
    results_recommendations: string;
  } | null;
}

export const PRESENSI_QUERY_KEY = ['presensi'];

// Fetch all attendance records with staleTime: 0
export function usePresensiQuery(teacherId?: string) {
  return useQuery<PresensiItem[]>({
    queryKey: teacherId ? [...PRESENSI_QUERY_KEY, teacherId] : PRESENSI_QUERY_KEY,
    queryFn: async () => {
      const url = teacherId ? `/api/presensi?teacher_id=${teacherId}` : '/api/presensi';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data presensi');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for Infinite Scroll loading of Presensi via TanStack Query
export function useInfinitePresensiQuery(teacherId?: string, pageSize = 6) {
  return useInfiniteQuery({
    queryKey: teacherId ? ['presensi-infinite', teacherId, pageSize] : ['presensi-infinite', pageSize],
    queryFn: async ({ pageParam = 1 }) => {
      const baseUrl = teacherId ? `/api/presensi?teacher_id=${teacherId}` : '/api/presensi';
      const sep = baseUrl.includes('?') ? '&' : '?';
      const url = `${baseUrl}${sep}page=${pageParam}&limit=${pageSize}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data presensi');
      const json = await res.json();
      const items: PresensiItem[] = json.data || [];
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

// 1-Click Check-In Mutation (No camera photo required!)
export function useCheckInMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      teacher_id: string;
      student_id: string;
      schedule_id?: string;
      date?: string;
      check_in?: string;
    }) => {
      const res = await fetch('/api/presensi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal melakukan Check-In');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PRESENSI_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['presensi-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      toast.success(data?.message || 'Check-In 1-Klik Berhasil!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal melakukan Check-In!');
    }
  });
}

// Submit Paired Session Log Mutation
export function useSubmitSessionLogMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      attendance_id?: string;
      teacher_id: string;
      student_id: string;
      session_number?: number;
      activities: string;
      results_recommendations: string;
      session_date?: string;
    }) => {
      const res = await fetch('/api/session-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengirim laporan belajar siswa');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PRESENSI_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['presensi-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      toast.success(data?.message || 'Laporan belajar berhasil disubmit! Status sesi menjadi Valid.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengirim laporan belajar!');
    }
  });
}

// Admin Manual Verification Override Mutation (Istri Pemilik)
export function useManualVerifyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ManualVerified' | 'Valid' }) => {
      const res = await fetch(`/api/presensi/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memvalidasi sesi secara manual');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PRESENSI_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['presensi-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      toast.info(data?.message || 'Sesi berhasil divalidasi manual oleh Admin!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memvalidasi sesi!');
    }
  });
}

// Delete Attendance Record Mutation
export function useDeletePresensiMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/presensi/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus rekod presensi');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PRESENSI_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['presensi-infinite'] });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      toast.error(data?.message || 'Rekod presensi berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus rekod presensi!');
    }
  });
}
