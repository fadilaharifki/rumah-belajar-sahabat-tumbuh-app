-- ============================================================================
-- 18_sync_valid_payroll_honor.sql
-- SINKRONISASI HONORARIUM PAYROLL HANYA UNTUK SESI YANG VALID / DI-ACC
-- Sesi yang belum disetujui (PendingApproval, CheckIn, NeedRevision, Invalid)
-- TIDAK BOLEH dihitung ke dalam total sesi maupun total nominal honorarium.
-- ============================================================================

-- 1. TRIGGER FUNCTION: Hitung honor HANYA untuk sesi 'Valid' dan 'ManualVerified'
CREATE OR REPLACE FUNCTION public.sync_payroll_on_attendance()
RETURNS TRIGGER AS $$
DECLARE
    v_teacher_id UUID;
    v_date DATE;
    v_month VARCHAR(7);
    v_sessions INT;
    v_rate NUMERIC;
BEGIN
    -- Tentukan target teacher dan bulan berdasarkan operasi trigger
    IF TG_OP = 'DELETE' THEN
        v_teacher_id := OLD.teacher_id;
        v_date := OLD.date::date;
    ELSE
        v_teacher_id := NEW.teacher_id;
        v_date := NEW.date::date;
    END IF;

    v_month := to_char(v_date, 'YYYY-MM');

    -- Hitung HANYA sesi yang telah divalidasi/disetujui oleh atasan
    SELECT COUNT(*) INTO v_sessions 
    FROM public.attendance_records 
    WHERE teacher_id = v_teacher_id 
      AND to_char(date::date, 'YYYY-MM') = v_month
      AND status::text IN ('Valid', 'ManualVerified');

    -- Ambil tarif honor per sesi guru (default 20000 jika kosong)
    SELECT COALESCE(session_rate, 20000) INTO v_rate 
    FROM public.teachers 
    WHERE id = v_teacher_id;

    IF v_rate IS NULL THEN
        v_rate := 20000;
    END IF;

    -- Upsert ke tabel payrolls
    INSERT INTO public.payrolls (
        teacher_id, 
        period_month, 
        total_sessions, 
        rate_per_session, 
        total_amount, 
        status
    )
    VALUES (
        v_teacher_id,
        v_month,
        v_sessions,
        v_rate,
        v_sessions * v_rate,
        'Draft'::payroll_status
    )
    ON CONFLICT (teacher_id, period_month) DO UPDATE
    SET total_sessions = EXCLUDED.total_sessions,
        rate_per_session = EXCLUDED.rate_per_session,
        total_amount = EXCLUDED.total_amount;

    -- Jika operasi UPDATE mengubah bulan atau guru, sinkronkan juga data bulan/guru yang lama
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.teacher_id IS DISTINCT FROM NEW.teacher_id) OR 
           (to_char(OLD.date::date, 'YYYY-MM') IS DISTINCT FROM to_char(NEW.date::date, 'YYYY-MM')) THEN
            
            SELECT COUNT(*) INTO v_sessions 
            FROM public.attendance_records 
            WHERE teacher_id = OLD.teacher_id 
              AND to_char(date::date, 'YYYY-MM') = to_char(OLD.date::date, 'YYYY-MM')
              AND status::text IN ('Valid', 'ManualVerified');

            SELECT COALESCE(session_rate, 20000) INTO v_rate 
            FROM public.teachers 
            WHERE id = OLD.teacher_id;

            INSERT INTO public.payrolls (
                teacher_id, 
                period_month, 
                total_sessions, 
                rate_per_session, 
                total_amount, 
                status
            )
            VALUES (
                OLD.teacher_id,
                to_char(OLD.date::date, 'YYYY-MM'),
                v_sessions,
                COALESCE(v_rate, 20000),
                v_sessions * COALESCE(v_rate, 20000),
                'Draft'::payroll_status
            )
            ON CONFLICT (teacher_id, period_month) DO UPDATE
            SET total_sessions = EXCLUDED.total_sessions,
                rate_per_session = EXCLUDED.rate_per_session,
                total_amount = EXCLUDED.total_amount;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Pasang kembali trigger pada attendance_records
DROP TRIGGER IF EXISTS trg_sync_payroll_on_attendance ON public.attendance_records;
CREATE TRIGGER trg_sync_payroll_on_attendance
AFTER INSERT OR UPDATE OF status, teacher_id, date OR DELETE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_payroll_on_attendance();

-- 3. REKONSILIASI DATA HISTORIS:
-- Perbarui seluruh data payrolls yang ada agar strictly mencerminkan sesi Valid / ManualVerified
UPDATE public.payrolls p
SET total_sessions = COALESCE(v.valid_count, 0),
    total_amount = COALESCE(v.valid_count, 0) * p.rate_per_session
FROM (
    SELECT 
        teacher_id, 
        to_char(date::date, 'YYYY-MM') AS month,
        COUNT(*) AS valid_count
    FROM public.attendance_records
    WHERE status::text IN ('Valid', 'ManualVerified')
    GROUP BY teacher_id, to_char(date::date, 'YYYY-MM')
) v
WHERE p.teacher_id = v.teacher_id 
  AND p.period_month = v.month;

-- Setel ke 0 untuk data payroll yang belum memiliki satupun sesi Valid
UPDATE public.payrolls p
SET total_sessions = 0,
    total_amount = 0
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.attendance_records a
    WHERE a.teacher_id = p.teacher_id
      AND to_char(a.date::date, 'YYYY-MM') = p.period_month
      AND a.status::text IN ('Valid', 'ManualVerified')
);
