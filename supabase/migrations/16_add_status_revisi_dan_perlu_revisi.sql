-- ============================================================================
-- 16_add_status_revisi_dan_perlu_revisi.sql
-- ============================================================================
-- Menambahkan status terpisah 'NeedRevision' (Perlu Revisi) pada ENUM:
-- - 'Invalid'        : Ditolak permanen (sesi hangus / tidak sah, tidak dapat direvisi)
-- - 'NeedRevision'   : Perlu Revisi (sesi hadir tapi laporan/jurnal butuh perbaikan guru)
-- - 'PendingApproval': Menunggu Approval dari Atasan / Supervisor
-- - 'Valid'          : Disetujui (masuk perhitungan honor pengajar)
-- - 'ManualVerified' : Validasi manual admin
-- - 'CheckIn'        : Baru check-in, belum submit laporan
-- ============================================================================

-- 1. Tambahkan nilai 'NeedRevision' pada ENUM PostgreSQL (Idempotent)
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'NeedRevision';
ALTER TYPE session_log_status ADD VALUE IF NOT EXISTS 'NeedRevision';

-- 2. Update fungsi trigger sinkronisasi attendance_records -> session_logs
CREATE OR REPLACE FUNCTION public.handle_sync_attendance_to_session_log()
RETURNS TRIGGER AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
        -- Status Valid / ManualVerified -> session_logs.approval_status = 'Valid'
        IF NEW.status IN ('Valid'::attendance_status, 'ManualVerified'::attendance_status) THEN
            UPDATE public.session_logs
            SET approval_status = 'Valid'::session_log_status,
                approved_at = COALESCE(NEW.approved_at, NOW()),
                approver_id = COALESCE(NEW.approved_by, approver_id)
            WHERE attendance_id = NEW.id;

        -- Status NeedRevision -> session_logs.approval_status = 'NeedRevision'
        ELSIF NEW.status = 'NeedRevision'::attendance_status THEN
            UPDATE public.session_logs
            SET approval_status = 'NeedRevision'::session_log_status,
                rejection_reason = COALESCE(NEW.approval_notes, rejection_reason)
            WHERE attendance_id = NEW.id;

        -- Status Invalid -> session_logs.approval_status = 'Invalid'
        ELSIF NEW.status = 'Invalid'::attendance_status THEN
            UPDATE public.session_logs
            SET approval_status = 'Invalid'::session_log_status,
                rejection_reason = COALESCE(NEW.approval_notes, rejection_reason)
            WHERE attendance_id = NEW.id;

        -- Status PendingApproval -> session_logs.approval_status = 'PendingApproval'
        ELSIF NEW.status = 'PendingApproval'::attendance_status THEN
            UPDATE public.session_logs
            SET approval_status = 'PendingApproval'::session_log_status
            WHERE attendance_id = NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update fungsi trigger sinkronisasi session_logs -> attendance_records
CREATE OR REPLACE FUNCTION public.handle_sync_session_log_to_attendance()
RETURNS TRIGGER AS $$
DECLARE
    v_att_id UUID;
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    v_att_id := NEW.attendance_id;

    IF v_att_id IS NOT NULL THEN
        IF NEW.approval_status = 'Valid'::session_log_status THEN
            UPDATE public.attendance_records
            SET status = 'Valid'::attendance_status,
                approved_by = COALESCE(NEW.approver_id, approved_by),
                approved_at = COALESCE(NEW.approved_at, NOW())
            WHERE id = v_att_id;

        ELSIF NEW.approval_status = 'NeedRevision'::session_log_status THEN
            UPDATE public.attendance_records
            SET status = 'NeedRevision'::attendance_status,
                approval_notes = COALESCE(NEW.rejection_reason, approval_notes)
            WHERE id = v_att_id;

        ELSIF NEW.approval_status = 'Invalid'::session_log_status THEN
            UPDATE public.attendance_records
            SET status = 'Invalid'::attendance_status,
                approval_notes = COALESCE(NEW.rejection_reason, approval_notes)
            WHERE id = v_att_id;

        ELSIF NEW.approval_status = 'PendingApproval'::session_log_status THEN
            UPDATE public.attendance_records
            SET status = 'PendingApproval'::attendance_status
            WHERE id = v_att_id
              AND status NOT IN ('Valid'::attendance_status, 'ManualVerified'::attendance_status);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
