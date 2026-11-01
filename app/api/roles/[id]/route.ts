import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/roles/[id] - Update name, description, and permissions for a role
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions } = body;

    if (isSupabaseConfigured) {
      // 1. Update role name & description if name is provided
      if (name) {
        const updatePayload: Record<string, any> = {
          name: name.trim(),
          description: typeof description === 'string' ? description.trim() : ''
        };

        const { error: roleErr } = await supabase
          .from('roles')
          .update(updatePayload)
          .eq('id', id);

        if (roleErr) throw roleErr;
      }

      // 2. Update permissions if permissions array is provided
      if (Array.isArray(permissions)) {
        // Clear old permissions for this role
        await supabase.from('role_permissions').delete().eq('role_id', id);

        // Insert new permissions array
        if (permissions.length > 0) {
          const records = permissions.map((key: string) => ({
            role_id: id,
            permission_key: key
          }));
          const { error: permErr } = await supabase.from('role_permissions').insert(records);
          if (permErr) throw permErr;
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Data peran & ability berhasil diperbarui!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/roles/[id] - Delete custom role
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Role berhasil dihapus' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
