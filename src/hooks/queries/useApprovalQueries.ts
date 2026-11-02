import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from '@/stores/useToastStore';

export interface ApprovalItem {
  id: string; // attendance_record_id
  date: string;
  check_in: string;
  check_out?: string;
  duration_minutes?: number;
  status: 'PendingApproval' | 'Valid' | 'Invalid' | 'CheckIn' | 'ManualVerified' | 'NeedRevision';
  approved_by?: string | null;
  approver_name?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  created_at?: string;
  updated_at?: string;

  teacher: {
    id: string;
    name: string;
    photo_url?: string;
    phone?: string;
    session_rate: number;
    supervisor_id?: string | null;
    supervisor_name?: string;
  };

  student: {
    id: string;
    name: string;
    grade: string;
    avatar_url?: string;
  };

  session_log: {
    id: string;
    session_number: number;
    activities: string;
    notes: string;
    photo_url?: string;
    approval_status?: string;
    rejection_reason?: string;
    created_at?: string;
    updated_at?: string;
  } | null;
}

export interface ApprovalCounts {
  pending: number;
  valid: number;
  invalid: number;
  total: number;
}

export interface ApprovalResponse {
  success: boolean;
  data: ApprovalItem[];
  counts: ApprovalCounts;
  superviseeCount?: number;
  message?: string;
}

// Hook to query approval items scoped to current user's supervisees
export function useApprovalListQuery(params?: {
  status?: string;
  month?: string;
  teacherId?: string;
  supervisorId?: string;
}) {
  const { user } = useAuthStore();

  return useQuery<ApprovalResponse>({
    queryKey: ['approval-list', user?.id, user?.role, params?.status, params?.month, params?.teacherId, params?.supervisorId],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.month) sp.append('month', params.month);
      if (params?.teacherId && params.teacherId !== 'all') sp.append('teacher_id', params.teacherId);
      if (params?.supervisorId && params.supervisorId !== 'all') sp.append('supervisor_id', params.supervisorId);
      if (user?.id) sp.append('user_id', user.id);
      if (user?.role) sp.append('role', user.role);

      const res = await fetch(`/api/approval?${sp.toString()}`);
      if (!res.ok) {
        throw new Error('Gagal memuat data persetujuan evaluasi');
      }
      return res.json();
    },
    enabled: Boolean(user?.id),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true
  });
}

// Hook to execute Approve or Reject or Request Revision on a session
export function useExecuteApprovalMutation() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      attendanceId,
      action,
      notes
    }: {
      attendanceId: string;
      action: 'Valid' | 'NeedRevision' | 'Invalid';
      notes?: string;
    }) => {
      const res = await fetch(`/api/presensi/${attendanceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action,
          approved_by: user?.id,
          approval_notes: notes || (action === 'Valid' ? 'Disetujui oleh atasan' : action === 'NeedRevision' ? 'Perlu perbaikan laporan' : 'Ditolak, tidak valid')
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses aksi persetujuan');
      }
      return json;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['approval-list'] });
      queryClient.invalidateQueries({ queryKey: ['presensi'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });

      if (variables.action === 'Valid') {
        toast.success('Laporan evaluasi berhasil disetujui (Valid)! Sesi masuk ke perhitungan honor.');
      } else if (variables.action === 'NeedRevision') {
        toast.info('Laporan evaluasi dikembalikan ke guru untuk direvisi (Perlu Revisi).');
      } else {
        toast.warning('Laporan evaluasi ditolak permanen (Tidak Valid).');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal memproses persetujuan laporan!');
    }
  });
}

