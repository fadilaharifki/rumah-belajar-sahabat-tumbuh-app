import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/stores/useToastStore';

export interface ScheduleItem {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_photo?: string;
  teacher_phone?: string;
  student_id: string;
  student_name: string;
  student_grade: string;
  student_avatar?: string;
  day_of_week: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
  start_time: string;
  end_time: string;
  room: string;
  status: string;
}

export const JADWAL_QUERY_KEY = ['jadwal'];

// Hook for fetching all Schedules with staleTime: 0
export function useJadwalQuery() {
  return useQuery<ScheduleItem[]>({
    queryKey: JADWAL_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/jadwal');
      if (!res.ok) throw new Error('Gagal mengambil data jadwal ngajar');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 0,
    refetchOnMount: true
  });
}

// Hook for adding a new Schedule with Toast Notifications
export function useCreateJadwalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newJadwal: {
      teacher_id: string;
      student_id: string;
      day_of_week: string;
      start_time: string;
      end_time: string;
      room?: string;
      status?: string;
    }) => {
      const res = await fetch('/api/jadwal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJadwal)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menambahkan jadwal ngajar baru');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: JADWAL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      toast.success(data?.message || 'Jadwal ngajar baru berhasil ditambahkan!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menambahkan jadwal ngajar baru!');
    }
  });
}

// Hook for updating Schedule with Toast Notifications
export function useUpdateJadwalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      teacher_id?: string;
      student_id?: string;
      day_of_week?: string;
      start_time?: string;
      end_time?: string;
      room?: string;
      status?: string;
    }) => {
      const res = await fetch(`/api/jadwal/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memperbarui jadwal ngajar');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: JADWAL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      toast.success(data?.message || 'Jadwal ngajar berhasil diperbarui!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memperbarui jadwal ngajar!');
    }
  });
}

// Hook for deleting Schedule with Toast Notifications
export function useDeleteJadwalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/jadwal/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus jadwal ngajar');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: JADWAL_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['guru-detail'] });
      toast.error(data?.message || 'Jadwal ngajar berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus jadwal ngajar!');
    }
  });
}
