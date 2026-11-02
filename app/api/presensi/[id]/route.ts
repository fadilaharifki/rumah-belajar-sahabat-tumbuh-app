import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
);

// PUT /api/presensi/[id] - Approval or update by Supervisor / Admin
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      status, 
      approved_by, 
      approval_notes, 
      check_in, 
      check_out, 
      duration_minutes 
    } = body;

    if (isSupabaseConfigured) {
      // 1. Resolve approver identities for robust foreign keys & Anti-Self Approval
      let approverUserRecord: any = null;
      if (approved_by) {
        const orFilter = approved_by.includes('@')
          ? `email.eq.${approved_by}`
          : `id.eq.${approved_by},auth_user_id.eq.${approved_by}`;
        const { data: dbApprover } = await supabase
          .from('users')
          .select('id, auth_user_id')
          .or(orFilter)
          .maybeSingle();
        approverUserRecord = dbApprover;
      }

      const approverIds = new Set<string>([
        approved_by,
        approverUserRecord?.id,
        approverUserRecord?.auth_user_id
      ].filter(Boolean));

      // 2. Ambil data record presensi saat ini
      const { data: currentAtt } = await supabase
        .from('attendance_records')
        .select('*, teachers(id, user_id, name)')
        .eq('id', id)
        .maybeSingle();

      if (!currentAtt) {
        // Fallback: check in session_logs if id is a session_log id or standalone attendance_id
        const { data: currentLog } = await supabase
          .from('session_logs')
          .select('*, teachers(id, user_id, name)')
          .or(`id.eq.${id},attendance_id.eq.${id}`)
          .maybeSingle();

        if (currentLog) {
          // Anti-Self Approval check for standalone session_logs
          if (currentLog.teachers?.user_id && approverIds.has(currentLog.teachers.user_id)) {
            return NextResponse.json({
              success: false,
              error: 'Guru Senior tidak diperbolehkan meng-approve laporan evaluasinya sendiri. Laporan harus disetujui oleh Pemilik / Admin Utama!'
            }, { status: 403 });
          }

          const logPayload: Record<string, any> = {};
          if (status) logPayload.approval_status = status;
          if (status === 'Valid') {
            logPayload.verified = true;
          } else if (status === 'Invalid') {
            logPayload.verified = false;
            if (approval_notes) logPayload.rejection_reason = approval_notes;
          }
          if (approved_by) logPayload.approver_id = approverUserRecord?.id || approved_by;
          logPayload.approved_at = new Date().toISOString();

          await supabase
            .from('session_logs')
            .update(logPayload)
            .eq('id', currentLog.id);

          return NextResponse.json({
            success: true,
            data: currentLog,
            message: `Laporan evaluasi berhasil diperbarui (${status}).`
          });
        }

        return NextResponse.json({ success: false, error: 'Data presensi tidak ditemukan!' }, { status: 404 });
      }

      // 3. Proteksi Anti-Self Approval: Guru tidak boleh meng-approve laporannya sendiri
      if (currentAtt.teachers?.user_id && approverIds.has(currentAtt.teachers.user_id)) {
        return NextResponse.json({
          success: false,
          error: 'Guru Senior tidak diperbolehkan meng-approve laporan evaluasinya sendiri. Laporan harus disetujui oleh Pemilik / Admin Utama!'
        }, { status: 403 });
      }

      const updatePayload: Record<string, any> = {};
      if (status) updatePayload.status = status;
      if (approved_by) updatePayload.approved_by = approverUserRecord?.id || approved_by;
      if (approval_notes !== undefined) updatePayload.approval_notes = approval_notes;
      if (status === 'Valid' || status === 'Invalid' || status === 'NeedRevision' || status === 'ManualVerified') {
        updatePayload.approved_at = new Date().toISOString();
      }
      if (check_in) updatePayload.check_in = check_in;
      if (check_out !== undefined) updatePayload.check_out = check_out;
      if (duration_minutes !== undefined) updatePayload.duration_minutes = duration_minutes;

      const { data: updatedAtt, error } = await supabase
        .from('attendance_records')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 3. Sinkronkan status pada tabel session_logs jika ada
      const logUpdatePayload: Record<string, any> = {};
      if (status === 'Valid') {
        logUpdatePayload.approval_status = 'Valid';
        logUpdatePayload.verified = true;
        if (approved_by) logUpdatePayload.approver_id = approverUserRecord?.id || approved_by;
        logUpdatePayload.approved_at = new Date().toISOString();
      } else if (status === 'NeedRevision') {
        logUpdatePayload.approval_status = 'NeedRevision';
        logUpdatePayload.verified = false;
        if (approved_by) logUpdatePayload.approver_id = approverUserRecord?.id || approved_by;
        if (approval_notes) logUpdatePayload.rejection_reason = approval_notes;
        logUpdatePayload.approved_at = new Date().toISOString();
      } else if (status === 'Invalid') {
        logUpdatePayload.approval_status = 'Invalid';
        logUpdatePayload.verified = false;
        if (approved_by) logUpdatePayload.approver_id = approverUserRecord?.id || approved_by;
        if (approval_notes) logUpdatePayload.rejection_reason = approval_notes;
        logUpdatePayload.approved_at = new Date().toISOString();
      } else if (status === 'PendingApproval') {
        logUpdatePayload.approval_status = 'PendingApproval';
        logUpdatePayload.verified = false;
      }

      if (Object.keys(logUpdatePayload).length > 0) {
        await supabase
          .from('session_logs')
          .update(logUpdatePayload)
          .eq('attendance_id', id);
      }

      let msg = 'Presensi berhasil diperbarui.';
      if (status === 'Valid') msg = 'Laporan evaluasi berhasil Disetujui (Valid)! Sesi masuk ke rekap honor guru.';
      if (status === 'NeedRevision') msg = 'Laporan evaluasi dikembalikan ke pengajar untuk direvisi (Perlu Revisi).';
      if (status === 'Invalid') msg = 'Laporan evaluasi ditolak permanen (Tidak Valid).';
      if (status === 'ManualVerified') msg = 'Sesi berhasil divalidasi manual oleh Admin.';
      if (status === 'ManualVerified') msg = 'Sesi berhasil divalidasi manual oleh Admin.';

      return NextResponse.json({
        success: true,
        data: updatedAtt,
        message: msg
      });
    }

    return NextResponse.json({ success: true, message: 'Presensi updated (mock mode)' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/presensi/[id] - Delete attendance record
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('attendance_records').delete().eq('id', id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'Rekod presensi berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
