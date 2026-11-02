import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RoleItem, useRoleStore } from '@/stores/useRoleStore';
import { toast } from '@/stores/useToastStore';

export interface CreateRolePayload {
  name: string;
  description?: string;
  permissions: string[];
}

// Custom Hook for Fetching Roles & Permissions
export const useRolesQuery = () => {
  return useQuery<RoleItem[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles');
      if (!res.ok) throw new Error('Gagal mengambil daftar peran');
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 1000 * 60 * 5
  });
};

// Custom Hook Mutation for Creating New Role
export const useCreateRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRolePayload) => {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuat peran kustom baru!');
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(`Role kustom "${data?.name || 'baru'}" berhasil dibuat!`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menyimpan peran kustom!');
    }
  });
};

export interface UpdateRolePayload {
  roleId: string;
  name?: string;
  description?: string;
  permissions?: string[];
}

// Custom Hook Mutation for Updating Role Details & Permissions
export const useUpdateRoleMutation = () => {
  const queryClient = useQueryClient();
  const { updateRole } = useRoleStore();

  return useMutation({
    mutationFn: async ({ roleId, name, description, permissions }: UpdateRolePayload) => {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, permissions })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui data peran!');
      }
      return { roleId, name, description, permissions };
    },
    onSuccess: ({ roleId, name, description, permissions }) => {
      updateRole(roleId, { name, description, permissions });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Data peran & ability berhasil diperbarui!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal mengubah data peran!');
    }
  });
};

export const useUpdateRolePermissionsMutation = useUpdateRoleMutation;

// Custom Hook Mutation for Deleting Custom Role
export const useDeleteRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus peran!');
      }
      return roleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.info('Role kustom berhasil dihapus.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Gagal menghapus peran!');
    }
  });
};
