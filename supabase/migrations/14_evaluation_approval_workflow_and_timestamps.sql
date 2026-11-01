-- 14_evaluation_approval_workflow_and_timestamps.sql
-- Penambahan fitur:
-- 1. Kolom updated_at dan auto-trigger untuk audit trail di semua tabel utama.
-- 2. Hubungan supervisor_id di tabel teachers (Model 2: Guru Senior / Koordinator).
-- 3. Status approval (PendingApproval, Valid, Invalid) dan kolom audit pada attendance_records & session_logs.
-- 4. Penyesuaian trigger validasi dan sinkronisasi penggajian (hanya sesi Valid/ManualVerified yang dihitung).
-- 5. Seed permission RBAC baru: presensi:approve.

-- ============================================================================
-- 1. FUNGSI AUTO-TRIGGER UNTUK updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. PENAMBAHAN KOLOM updated_at DAN TRIGGER PADA TABEL-TABEL UTAMA
-- ============================================================================

-- A. session_logs
ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_session_logs_updated_at ON public.session_logs;
CREATE TRIGGER trg_session_logs_updated_at
BEFORE UPDATE ON public.session_logs
FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- B. attendance_records
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- C. teachers
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_teachers_updated_at ON public.teachers;
CREATE TRIGGER trg_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- D. students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_students_updated_at ON public.students;
CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- E. schedules
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_schedules_updated_at ON public.schedules;
CREATE TRIGGER trg_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- F. payrolls
ALTER TABLE public.payrolls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_payrolls_updated_at ON public.payrolls;
CREATE TRIGGER trg_payrolls_updated_at
BEFORE UPDATE ON public.payrolls
FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- G. users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_set_updated_at();

-- ============================================================================
-- 3. HUBUNGAN SUPERVISOR PADA DATA GURU (Model 2: Guru Senior / Koordinator)
-- ============================================================================
ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_supervisor_id ON public.teachers(supervisor_id);

-- ============================================================================
-- 4. STRUKTUR APPROVAL PADA TABEL attendance_records
-- ============================================================================
-- Tambah kolom-kolom penunjang approval
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_attendance_approved_by ON public.attendance_records(approved_by);

-- Perbarui check constraint status pada attendance_records
DO $$
DECLARE
    v_constraint_name TEXT;
BEGIN
    FOR v_constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.attendance_records'::regclass 
          AND contype = 'c' 
          AND conname LIKE '%status%'
    LOOP
        EXECUTE 'ALTER TABLE public.attendance_records DROP CONSTRAINT ' || quote_ident(v_constraint_name);
    END LOOP;
END $$;

ALTER TABLE public.attendance_records 
ADD CONSTRAINT check_attendance_status 
CHECK (status IN ('CheckIn', 'PendingApproval', 'Valid', 'Invalid', 'ManualVerified'));

-- ============================================================================
-- 5. STRUKTUR APPROVAL PADA TABEL session_logs
-- ============================================================================
ALTER TABLE public.session_logs 
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_session_logs_approver_id ON public.session_logs(approver_id);

-- Tambahkan approval_status pada session_logs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'session_logs' AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.session_logs 
        ADD COLUMN approval_status VARCHAR(50) NOT NULL DEFAULT 'PendingApproval'
        CHECK (approval_status IN ('PendingApproval', 'Valid', 'Invalid'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_logs_approval_status ON public.session_logs(approval_status);

-- ============================================================================
-- 6. PERBARUI TRIGGER: SINKRONISASI STATUS ATTENDANCE DARI SESSION_LOGS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_auto_validate_attendance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attendance_id IS NOT NULL THEN
        IF NEW.approval_status = 'Valid' THEN
            UPDATE public.attendance_records
            SET status = 'Valid',
                approved_by = NEW.approver_id,
                approved_at = COALESCE(NEW.approved_at, NOW())
            WHERE id = NEW.attendance_id;
        ELSIF NEW.approval_status = 'Invalid' THEN
            UPDATE public.attendance_records
            SET status = 'Invalid',
                approval_notes = NEW.rejection_reason
            WHERE id = NEW.attendance_id;
        ELSE
            -- Saat guru baru saja submit laporan evaluasi
            UPDATE public.attendance_records
            SET status = 'PendingApproval'
            WHERE id = NEW.attendance_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_validate_attendance ON public.session_logs;
CREATE TRIGGER trg_auto_validate_attendance
AFTER INSERT OR UPDATE ON public.session_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_auto_validate_attendance();

-- ============================================================================
-- 7. PERBARUI TRIGGER: SINKRONISASI PENGGAJIAN (HANYA SESI VALID / MANUALVERIFIED)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_payroll_on_attendance()
RETURNS TRIGGER AS $$
DECLARE
    v_month VARCHAR(7);
    v_sessions INT;
    v_rate NUMERIC;
BEGIN
    v_month := to_char(NEW.date::date, 'YYYY-MM');

    -- Hitung HANYA sesi yang telah disetujui (Valid) atau diverifikasi manual oleh Atasan
    SELECT COUNT(*) INTO v_sessions 
    FROM public.attendance_records 
    WHERE teacher_id = NEW.teacher_id 
      AND to_char(date::date, 'YYYY-MM') = v_month
      AND status IN ('Valid', 'ManualVerified');

    -- Ambil tarif per sesi guru
    SELECT COALESCE(session_rate, 85000) INTO v_rate 
    FROM public.teachers 
    WHERE id = NEW.teacher_id;

    -- Upsert ke tabel payrolls
    INSERT INTO public.payrolls (teacher_id, period_month, total_sessions, rate_per_session, total_amount, status)
    VALUES (
      NEW.teacher_id,
      v_month,
      v_sessions,
      COALESCE(v_rate, 85000),
      v_sessions * COALESCE(v_rate, 85000),
      'Draft'
    )
    ON CONFLICT (teacher_id, period_month) DO UPDATE
    SET total_sessions = EXCLUDED.total_sessions,
        rate_per_session = EXCLUDED.rate_per_session,
        total_amount = EXCLUDED.total_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payroll_on_attendance ON public.attendance_records;
CREATE TRIGGER trg_sync_payroll_on_attendance
AFTER INSERT OR UPDATE OF status, teacher_id, date ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_payroll_on_attendance();

-- ============================================================================
-- 8. RBAC: DAFTARKAN PERMISSION presensi:approve
-- ============================================================================
INSERT INTO public.permissions (key, label, group_name)
VALUES ('presensi:approve', 'Approval (Menyetujui & Memvalidasi Laporan Evaluasi)', 'Presensi & Check-In AI')
ON CONFLICT (key) DO UPDATE 
SET label = EXCLUDED.label, 
    group_name = EXCLUDED.group_name;

-- Berikan izin presensi:approve ke role Pemilik / Admin Utama secara default
INSERT INTO public.role_permissions (role_id, permission_key)
VALUES ('11111111-1111-1111-1111-000000000001', 'presensi:approve')
ON CONFLICT DO NOTHING;

-- Daftarkan role Guru Senior / Koordinator ke public.roles
INSERT INTO public.roles (id, name, description)
VALUES (
  '55555555-5555-5555-5555-000000000005',
  'Guru Senior / Koordinator',
  'Pengajar senior yang bertugas mengajar sekaligus memverifikasi & approval laporan evaluasi guru junior'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Pasangkan permission bawaan untuk Guru Senior / Koordinator
INSERT INTO public.role_permissions (role_id, permission_key)
VALUES 
  ('55555555-5555-5555-5555-000000000005', 'dashboard:read'),
  ('55555555-5555-5555-5555-000000000005', 'presensi:read'),
  ('55555555-5555-5555-5555-000000000005', 'presensi:create'),
  ('55555555-5555-5555-5555-000000000005', 'presensi:approve'),
  ('55555555-5555-5555-5555-000000000005', 'jadwal:read'),
  ('55555555-5555-5555-5555-000000000005', 'jadwal:create'),
  ('55555555-5555-5555-5555-000000000005', 'guru:read'),
  ('55555555-5555-5555-5555-000000000005', 'siswa:read'),
  ('55555555-5555-5555-5555-000000000005', 'siswa:create'),
  ('55555555-5555-5555-5555-000000000005', 'siswa:update'),
  ('55555555-5555-5555-5555-000000000005', 'wali:read')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. PERBAIKAN TRIGGER AUTH & AUTO-HEAL NAMA PENGGUNA BARU
-- ============================================================================

-- 9.1. Perbarui trigger handle_new_user agar TIDAK menimpa nama yang sudah ada dengan 'Pengguna Baru'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_meta_name TEXT;
BEGIN
  v_meta_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), NULLIF(NEW.raw_user_meta_data->>'name', ''));

  INSERT INTO public.users (auth_user_id, email, full_name, avatar_url, category, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(v_meta_name, 'Pengguna Baru'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'category', 'Guru'),
    COALESCE((NEW.raw_user_meta_data->>'role_id')::uuid, '22222222-2222-2222-2222-000000000002'::uuid)
  )
  ON CONFLICT (email) DO UPDATE
  SET auth_user_id = EXCLUDED.auth_user_id,
      -- JANGAN PERNAH MENIMPA NAMA VALID DENGAN 'Pengguna Baru'
      full_name = CASE 
        WHEN public.users.full_name IS NOT NULL AND TRIM(public.users.full_name) NOT IN ('', 'Pengguna Baru', 'Pengguna') 
          THEN public.users.full_name
        WHEN v_meta_name IS NOT NULL AND TRIM(v_meta_name) NOT IN ('', 'Pengguna Baru', 'Pengguna') 
          THEN v_meta_name
        ELSE public.users.full_name
      END,
      avatar_url = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.2. Perbarui reset_user_password agar menyertakan full_name dari public.users saat insert auth.users
CREATE OR REPLACE FUNCTION public.reset_user_password(target_email TEXT, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_encrypted TEXT;
    v_clean_email TEXT;
    v_existing_name TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(target_email));
    v_encrypted := crypt(new_password, gen_salt('bf', 10));

    -- 1. Coba update record auth.users yang sudah ada
    UPDATE auth.users
    SET encrypted_password = v_encrypted,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW(),
        role = 'authenticated',
        aud = 'authenticated'
    WHERE LOWER(email) = v_clean_email;

    IF FOUND THEN
        RETURN TRUE;
    END IF;

    -- 2. Ambil nama yang sudah diinput di public.users untuk dipertahankan di auth metadata
    SELECT full_name INTO v_existing_name FROM public.users WHERE LOWER(email) = v_clean_email LIMIT 1;

    -- 3. Jika belum ada di auth.users, buat baru dengan metadata nama yang sesuai
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_clean_email,
        v_encrypted,
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', COALESCE(NULLIF(v_existing_name, ''), 'Pengguna Baru')),
        FALSE,
        'authenticated',
        'authenticated'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.3. Auto-Heal baris public.users lama yang telanjur menjadi 'Pengguna Baru'
UPDATE public.users u
SET full_name = t.name
FROM public.teachers t
WHERE LOWER(u.email) = LOWER(t.email)
  AND (u.full_name IS NULL OR u.full_name IN ('Pengguna Baru', 'Pengguna'))
  AND t.name IS NOT NULL AND t.name != '';

UPDATE public.users u
SET full_name = p.name
FROM public.parents p
WHERE LOWER(u.email) = LOWER(p.email)
  AND (u.full_name IS NULL OR u.full_name IN ('Pengguna Baru', 'Pengguna'))
  AND p.name IS NOT NULL AND p.name != '';

UPDATE public.users u
SET full_name = s.name
FROM public.staff s
WHERE LOWER(u.email) = LOWER(s.email)
  AND (u.full_name IS NULL OR u.full_name IN ('Pengguna Baru', 'Pengguna'))
  AND s.name IS NOT NULL AND s.name != '';

-- Notifikasi PostgREST untuk memuat ulang cache skema API
NOTIFY pgrst, 'reload schema';

