import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/roles/[id] - Update permissions for a role
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { permissions } = await request.json();

    if (!Array.isArray(permissions)) {
      return NextResponse.json({ success: false, error: 'Permissions harus berupa array' }, { status: 400 });
    }

    if (isSupabaseConfigured) {
      // Clear old permissions for this role
      await supabase.from('role_permissions').delete().eq('role_id', id);

      // Insert new permissions array
      if (permissions.length > 0) {
        const records = permissions.map((key: string) => ({
          role_id: id,
          permission_key: key
        }));
        const { error } = await supabase.from('role_permissions').insert(records);
        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true, message: 'Permissions berhasil diperbarui!' });
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
