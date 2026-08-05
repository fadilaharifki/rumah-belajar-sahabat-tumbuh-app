import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Teacher, Student } from '@/hooks/useMasterData';
import { toast } from '@/stores/useToastStore';

export interface ParentItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  studentCount?: number;
}

// --- TEACHERS QUERY & MUTATION ---
export const useTeachersQuery = () => {
  return useQuery<Teacher[]>({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await fetch('/api/guru');
      if (!res.ok) throw new Error('Gagal mengambil data guru');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 1000 * 60 * 5 // 5 minutes cache
  });
};

export const useCreateTeacherMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newTeacher: Partial<Teacher>) => {
      const res = await fetch('/api/guru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacher)
      });
      if (!res.ok) throw new Error('Gagal menyimpan data guru baru');
      return res.json();
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      toast.success(`Data guru "${resData?.data?.name || 'baru'}" berhasil disimpan!`);
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan guru: ${err.message}`);
    }
  });
};

// --- STUDENTS QUERY & MUTATION ---
export const useStudentsQuery = () => {
  return useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: async () => {
      const res = await fetch('/api/siswa');
      if (!res.ok) throw new Error('Gagal mengambil data siswa');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 1000 * 60 * 5
  });
};

export const useCreateStudentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStudent: Partial<Student>) => {
      const res = await fetch('/api/siswa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });
      if (!res.ok) throw new Error('Gagal menyimpan data siswa baru');
      return res.json();
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(`Data siswa "${resData?.data?.name || 'baru'}" berhasil disimpan!`);
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan siswa: ${err.message}`);
    }
  });
};

// --- PARENTS QUERY & MUTATION ---
export const useParentsQuery = () => {
  return useQuery<ParentItem[]>({
    queryKey: ['parents'],
    queryFn: async () => {
      const res = await fetch('/api/wali');
      if (!res.ok) throw new Error('Gagal mengambil data wali siswa');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 1000 * 60 * 5
  });
};

export const useCreateParentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newParent: Partial<ParentItem>) => {
      const res = await fetch('/api/wali', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParent)
      });
      if (!res.ok) throw new Error('Gagal menyimpan data wali baru');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      toast.success('Data wali siswa berhasil disimpan!');
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan wali: ${err.message}`);
    }
  });
};
