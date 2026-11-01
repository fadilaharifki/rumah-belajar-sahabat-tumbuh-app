-- ============================================================================
-- 15_status_enums_and_bidirectional_sync.sql
-- ============================================================================
-- Migrasi ini mengubah seluruh kolom status menjadi ENUM murni PostgreSQL:
-- 1. attendance_status       : ('CheckIn', 'PendingApproval', 'Valid', 'Invalid', 'ManualVerified')
-- 2. session_log_status     : ('PendingApproval', 'Valid', 'Invalid')
-- 3. payroll_status         : ('Draft', 'Lunas', 'Pending', 'Calculated')
-- 4. schedule_status        : ('Aktif', 'Nonaktif')
-- 5. user_status            : ('Aktif', 'Nonaktif')
--
-- Keuntungan ENUM di Supabase Table Editor:
-- Kolom status otomatis tampil sebagai DROPDOWN pilihan rapi di Supabase Studio!
-- Pengguna tinggal klik dan pilih status tanpa perlu mengetik manual (anti-typo).
--
-- Selain itu, dipasang trigger BIDIRECTIONAL SYNC:
-- - Ubah status di attendance_records -> otomatis sync ke session_logs & payrolls
-- - Ubah status di session_logs       -> otomatis sync ke attendance_records & payrolls
-- - Ubah status di students           -> otomatis sync ke schedules
-- - Ubah session_rate di teachers     -> otomatis sync hitung ulang payrolls 'Draft'
-- Dilengkapi proteksi pg_trigger_depth() agar bebas dari infinite loop / rekursi.
-- ============================================================================

-- ============================================================================
-- 1. DEFINISI ENUM TYPE POSTGRESQL (IDEMPOTENT)
-- ============================================================================

-- 1.1 attendance_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('CheckIn', 'PendingApproval', 'NeedRevision', 'Valid', 'Invalid', 'ManualVerified');
    END IF;
END $$;

-- 1.2 session_log_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'session_log_status') THEN
        CREATE TYPE session_log_status AS ENUM ('PendingApproval', 'NeedRevision', 'Valid', 'Invalid');
    END IF;
END $$;

-- 1.3 payroll_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payroll_status') THEN
        CREATE TYPE payroll_status AS ENUM ('Draft', 'Lunas', 'Pending', 'Calculated');
    END IF;
END $$;

-- 1.4 schedule_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status') THEN
        CREATE TYPE schedule_status AS ENUM ('Aktif', 'Nonaktif');
    END IF;
END $$;

-- 1.5 user_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('Aktif', 'Nonaktif');
    END IF;
END $$;

-- 1.6 student_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status') THEN
        CREATE TYPE student_status AS ENUM ('Aktif', 'Nonaktif');
    END IF;
END $$;

-- ============================================================================
-- 2. DROP DEPENDENT TRIGGERS SEBELUM MERUBAH TIPE DATA KOLOM
-- ============================================================================
-- PostgreSQL memblokir ALTER TYPE jika kolom masih dipakai oleh definisi trigger (misal: OF status).
-- Semua trigger terkait di-drop terlebih dahulu di sini, lalu dibuat ulang secara lengkap di Bagian 4.
DROP TRIGGER IF EXISTS trg_sync_payroll_on_attendance ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_sync_attendance_to_session_log ON public.attendance_records;
DROP TRIGGER IF EXISTS trg_auto_validate_attendance ON public.session_logs;
DROP TRIGGER IF EXISTS trg_sync_session_log_to_attendance ON public.session_logs;
DROP TRIGGER IF EXISTS trg_sync_student_status_to_schedules ON public.students;
DROP TRIGGER IF EXISTS trg_sync_teacher_rate_to_payrolls ON public.teachers;

-- ============================================================================
-- 3. KONVERSI KOLOM MENJADI ENUM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 public.attendance_records (status -> attendance_status)
-- ----------------------------------------------------------------------------
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'CheckIn';

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    -- Drop old check constraints
    FOR v_conname IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.attendance_records'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.attendance_records DROP CONSTRAINT ' || quote_ident(v_conname);
    END LOOP;
END $$;

-- Bersihkan data yang null / invalid
UPDATE public.attendance_records 
SET status = 'CheckIn' 
WHERE status IS NULL OR status::text NOT IN ('CheckIn', 'PendingApproval', 'Valid', 'Invalid', 'ManualVerified');

-- Drop default, convert type, pasang default enum baru
ALTER TABLE public.attendance_records ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.attendance_records ALTER COLUMN status TYPE attendance_status USING status::text::attendance_status;
ALTER TABLE public.attendance_records ALTER COLUMN status SET DEFAULT 'CheckIn'::attendance_status;
ALTER TABLE public.attendance_records ALTER COLUMN status SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.2 public.session_logs (approval_status -> session_log_status)
-- ----------------------------------------------------------------------------
-- Pastikan kolom approval_status & attendance_id ada
ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'PendingApproval';
ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS attendance_id UUID REFERENCES public.attendance_records(id) ON DELETE SET NULL;

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.session_logs'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%approval_status%'
    LOOP
        EXECUTE 'ALTER TABLE public.session_logs DROP CONSTRAINT ' || quote_ident(v_conname);
    END LOOP;
END $$;

UPDATE public.session_logs 
SET approval_status = 'PendingApproval' 
WHERE approval_status IS NULL OR approval_status::text NOT IN ('PendingApproval', 'Valid', 'Invalid');

ALTER TABLE public.session_logs ALTER COLUMN approval_status DROP DEFAULT;
ALTER TABLE public.session_logs ALTER COLUMN approval_status TYPE session_log_status USING approval_status::text::session_log_status;
ALTER TABLE public.session_logs ALTER COLUMN approval_status SET DEFAULT 'PendingApproval'::session_log_status;
ALTER TABLE public.session_logs ALTER COLUMN approval_status SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.3 public.payrolls (status -> payroll_status)
-- ----------------------------------------------------------------------------
ALTER TABLE public.payrolls ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Draft';

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.payrolls'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.payrolls DROP CONSTRAINT ' || quote_ident(v_conname);
    END LOOP;
END $$;

UPDATE public.payrolls 
SET status = 'Draft' 
WHERE status IS NULL OR status::text NOT IN ('Draft', 'Lunas', 'Pending', 'Calculated');

ALTER TABLE public.payrolls ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.payrolls ALTER COLUMN status TYPE payroll_status USING status::text::payroll_status;
ALTER TABLE public.payrolls ALTER COLUMN status SET DEFAULT 'Draft'::payroll_status;
ALTER TABLE public.payrolls ALTER COLUMN status SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.4 public.schedules (status -> schedule_status)
-- ----------------------------------------------------------------------------
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Aktif';

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.schedules'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.schedules DROP CONSTRAINT ' || quote_ident(v_conname);
    END LOOP;
END $$;

UPDATE public.schedules 
SET status = 'Aktif' 
WHERE status IS NULL OR status::text NOT IN ('Aktif', 'Nonaktif');

ALTER TABLE public.schedules ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.schedules ALTER COLUMN status TYPE schedule_status USING status::text::schedule_status;
ALTER TABLE public.schedules ALTER COLUMN status SET DEFAULT 'Aktif'::schedule_status;
ALTER TABLE public.schedules ALTER COLUMN status SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.5 public.users (status -> user_status)
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Aktif';

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(v_conname);
    END LOOP;
END $$;

UPDATE public.users 
SET status = 'Aktif' 
WHERE status IS NULL OR status::text NOT IN ('Aktif', 'Nonaktif');

ALTER TABLE public.users ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN status TYPE user_status USING status::text::user_status;
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'Aktif'::user_status;
ALTER TABLE public.users ALTER COLUMN status SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.6 public.teachers (status -> user_status)
-- ----------------------------------------------------------------------------
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Aktif';

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.teachers'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.teachers DROP CONSTRAINT ' || quote_ident(v_conname);
    END LOOP;
END $$;

UPDATE public.teachers 
SET status = 'Aktif' 
WHERE status IS NULL OR status::text NOT IN ('Aktif', 'Nonaktif');

ALTER TABLE public.teachers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.teachers ALTER COLUMN status TYPE user_status USING status::text::user_status;
ALTER TABLE public.teachers ALTER COLUMN status SET DEFAULT 'Aktif'::user_status;
ALTER TABLE public.teachers ALTER COLUMN status SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3.7 public.staff (status -> user_status)
-- ----------------------------------------------------------------------------
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Aktif';

DO $$
DECLARE
    v_conname TEXT;
BEGIN
    FOR v_conname IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.staff'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.staff DROP CONSTRAINT ' || quote_ident(v_conname);
    END LOOP;
END $$;

UPDATE public.staff 
SET status = 'Aktif' 
WHERE status IS NULL OR status::text NOT IN ('Aktif', 'Nonaktif');

ALTER TABLE public.staff ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.staff ALTER COLUMN status TYPE user_status USING status::text::user_status;
ALTER TABLE public.staff ALTER COLUMN status SET DEFAULT 'Aktif'::user_status;
ALTER TABLE public.staff ALTER COLUMN status SET NOT NULL;

-- ============================================================================
-- 4. SINKRONISASI DUA ARAH (BIDIRECTIONAL SYNC) DENGAN ANTI-REKURSI
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 SINKRONISASI: attendance_records -> session_logs
-- Jika status attendance_records diubah di Table Editor / UI, session_logs ikut sinkron!
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_sync_attendance_to_session_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Lindungi dari infinite loop / trigger recursion
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

DROP TRIGGER IF EXISTS trg_sync_attendance_to_session_log ON public.attendance_records;
CREATE TRIGGER trg_sync_attendance_to_session_log
AFTER UPDATE OF status ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.handle_sync_attendance_to_session_log();

-- ----------------------------------------------------------------------------
-- 4.2 SINKRONISASI: session_logs -> attendance_records
-- Jika approval_status session_logs diubah di Table Editor / UI, attendance ikut sinkron!
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_sync_session_log_to_attendance()
RETURNS TRIGGER AS $$
DECLARE
    v_att_id UUID;
BEGIN
    -- Lindungi dari infinite loop / trigger recursion
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

DROP TRIGGER IF EXISTS trg_sync_session_log_to_attendance ON public.session_logs;
CREATE TRIGGER trg_sync_session_log_to_attendance
AFTER INSERT OR UPDATE OF approval_status ON public.session_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_sync_session_log_to_attendance();

-- ----------------------------------------------------------------------------
-- 4.3 SINKRONISASI: attendance_records -> payrolls
-- Saat sesi presensi disetujui (Valid) atau dibatalkan, total sesi & honor payroll
-- bulan terkait otomatis dihitung ulang secara real-time!
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_payroll_on_attendance()
RETURNS TRIGGER AS $$
DECLARE
    v_teacher_id UUID;
    v_date DATE;
    v_month VARCHAR(7);
    v_sessions INT;
    v_rate NUMERIC;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_teacher_id := OLD.teacher_id;
        v_date := OLD.date::date;
    ELSE
        v_teacher_id := NEW.teacher_id;
        v_date := NEW.date::date;
    END IF;

    v_month := to_char(v_date, 'YYYY-MM');

    -- Hitung HANYA sesi yang Valid atau ManualVerified
    SELECT COUNT(*) INTO v_sessions 
    FROM public.attendance_records 
    WHERE teacher_id = v_teacher_id 
      AND to_char(date::date, 'YYYY-MM') = v_month
      AND status::text IN ('Valid', 'ManualVerified');

    -- Ambil tarif honor per sesi guru
    SELECT COALESCE(session_rate, 85000) INTO v_rate 
    FROM public.teachers 
    WHERE id = v_teacher_id;

    IF v_rate IS NULL THEN
        v_rate := 85000;
    END IF;

    -- Upsert ke payrolls
    INSERT INTO public.payrolls (teacher_id, period_month, total_sessions, rate_per_session, total_amount, status)
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

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payroll_on_attendance ON public.attendance_records;
CREATE TRIGGER trg_sync_payroll_on_attendance
AFTER INSERT OR UPDATE OF status, teacher_id, date OR DELETE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_payroll_on_attendance();

-- ----------------------------------------------------------------------------
-- 4.4 SINKRONISASI: teachers (session_rate) -> payrolls
-- Saat session_rate guru diupdate, seluruh payroll periode 'Draft' guru tersebut
-- otomatis dihitung ulang total honornya!
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_sync_teacher_rate_to_payrolls()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_rate IS DISTINCT FROM OLD.session_rate THEN
        UPDATE public.payrolls
        SET rate_per_session = NEW.session_rate,
            total_amount = total_sessions * NEW.session_rate
        WHERE teacher_id = NEW.id
          AND status::text = 'Draft';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_teacher_rate_to_payrolls ON public.teachers;
CREATE TRIGGER trg_sync_teacher_rate_to_payrolls
AFTER UPDATE OF session_rate ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.handle_sync_teacher_rate_to_payrolls();

-- ----------------------------------------------------------------------------
-- 4.5 SINKRONISASI: students (status) -> schedules (status)
-- Jika siswa dinonaktifkan ('Nonaktif'), jadwal belajarnya otomatis nonaktif.
-- Jika siswa diaktifkan kembali ('Aktif'), jadwal belajarnya ikut aktif.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_sync_student_status_to_schedules()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        UPDATE public.schedules
        SET status = CASE 
            WHEN NEW.status = 'Nonaktif'::student_status THEN 'Nonaktif'::schedule_status
            ELSE 'Aktif'::schedule_status
        END
        WHERE student_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_student_status_to_schedules ON public.students;
CREATE TRIGGER trg_sync_student_status_to_schedules
AFTER UPDATE OF status ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.handle_sync_student_status_to_schedules();

-- ============================================================================
-- 5. AUTO-HEAL: KOREKSI DATA PRESENSI TENGAH MALAM 1-2 NOVEMBER (WIB TIMEZONE)
-- ============================================================================
-- Koreksi otomatis rekaman presensi yang tersimpan tanggal 1 November padahal
-- dibuat pada tanggal 2 November 00:00 - 02:00 WIB (17:00 - 19:00 UTC)
UPDATE public.attendance_records
SET date = '2026-11-02'
WHERE date = '2026-11-01'
  AND created_at >= '2026-11-01 17:00:00+00';

-- ============================================================================
-- 6. REFRESH SCHEMA CACHE POSTGREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';

