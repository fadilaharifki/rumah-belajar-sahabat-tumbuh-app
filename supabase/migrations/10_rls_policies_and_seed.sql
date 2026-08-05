-- 10_rls_policies_and_seed.sql: Row Level Security Policies & Seed Data (Error-Free Safe Execution)

-- 1. Safely Enable RLS for all existing tables in public schema
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- 2. Safely Drop Existing Policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. SELECT (READ) POLICIES (Only for existing tables)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
    CREATE POLICY "Allow All Read Roles" ON public.roles FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'permissions') THEN
    CREATE POLICY "Allow All Read Permissions" ON public.permissions FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
    CREATE POLICY "Allow All Read RolePermissions" ON public.role_permissions FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE POLICY "Allow All Read Users" ON public.users FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parents') THEN
    CREATE POLICY "Allow All Read Parents" ON public.parents FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
    CREATE POLICY "Allow All Read Teachers" ON public.teachers FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    CREATE POLICY "Allow All Read Students" ON public.students FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
    CREATE POLICY "Allow All Read Staff" ON public.staff FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedules') THEN
    CREATE POLICY "Allow All Read Schedules" ON public.schedules FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_records') THEN
    CREATE POLICY "Allow All Read Attendance" ON public.attendance_records FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_logs') THEN
    CREATE POLICY "Allow All Read SessionLogs" ON public.session_logs FOR SELECT USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payrolls') THEN
    CREATE POLICY "Allow All Read Payrolls" ON public.payrolls FOR SELECT USING (true);
  END IF;
END $$;

-- 4. INSERT POLICIES
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
    CREATE POLICY "Allow Insert Roles" ON public.roles FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
    CREATE POLICY "Allow Insert RolePermissions" ON public.role_permissions FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE POLICY "Allow Insert Users" ON public.users FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parents') THEN
    CREATE POLICY "Allow Insert Parents" ON public.parents FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
    CREATE POLICY "Allow Insert Teachers" ON public.teachers FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    CREATE POLICY "Allow Insert Students" ON public.students FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
    CREATE POLICY "Allow Insert Staff" ON public.staff FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedules') THEN
    CREATE POLICY "Allow Insert Schedules" ON public.schedules FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_logs') THEN
    CREATE POLICY "Allow Insert SessionLogs" ON public.session_logs FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_records') THEN
    CREATE POLICY "Allow Insert Attendance" ON public.attendance_records FOR INSERT WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payrolls') THEN
    CREATE POLICY "Allow Insert Payrolls" ON public.payrolls FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 5. UPDATE POLICIES
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
    CREATE POLICY "Allow Update Roles" ON public.roles FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
    CREATE POLICY "Allow Update RolePermissions" ON public.role_permissions FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE POLICY "Allow Update Users" ON public.users FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parents') THEN
    CREATE POLICY "Allow Update Parents" ON public.parents FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
    CREATE POLICY "Allow Update Teachers" ON public.teachers FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    CREATE POLICY "Allow Update Students" ON public.students FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
    CREATE POLICY "Allow Update Staff" ON public.staff FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedules') THEN
    CREATE POLICY "Allow Update Schedules" ON public.schedules FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_logs') THEN
    CREATE POLICY "Allow Update SessionLogs" ON public.session_logs FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_records') THEN
    CREATE POLICY "Allow Update Attendance" ON public.attendance_records FOR UPDATE USING (true) WITH CHECK (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payrolls') THEN
    CREATE POLICY "Allow Update Payrolls" ON public.payrolls FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 6. DELETE POLICIES
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
    CREATE POLICY "Allow Delete Roles" ON public.roles FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
    CREATE POLICY "Allow Delete RolePermissions" ON public.role_permissions FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE POLICY "Allow Delete Users" ON public.users FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parents') THEN
    CREATE POLICY "Allow Delete Parents" ON public.parents FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teachers') THEN
    CREATE POLICY "Allow Delete Teachers" ON public.teachers FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
    CREATE POLICY "Allow Delete Students" ON public.students FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'staff') THEN
    CREATE POLICY "Allow Delete Staff" ON public.staff FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedules') THEN
    CREATE POLICY "Allow Delete Schedules" ON public.schedules FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'session_logs') THEN
    CREATE POLICY "Allow Delete SessionLogs" ON public.session_logs FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance_records') THEN
    CREATE POLICY "Allow Delete Attendance" ON public.attendance_records FOR DELETE USING (true);
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payrolls') THEN
    CREATE POLICY "Allow Delete Payrolls" ON public.payrolls FOR DELETE USING (true);
  END IF;
END $$;

-- 7. Seed Initial Roles with Deterministic UUIDs
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
    INSERT INTO public.roles (id, name, description) VALUES
    ('11111111-1111-1111-1111-000000000001', 'Pemilik / Admin Utama', 'Akses penuh tanpa batas (Full CRUD & RBAC Control)'),
    ('22222222-2222-2222-2222-000000000002', 'Pengajar / Guru Pendamping', 'Bisa melihat dashboard, presensi AI, jadwal, data guru & siswa, serta menginput jurnal catatan sesi'),
    ('33333333-3333-3333-3333-000000000003', 'Wali Siswa / Orang Tua', 'Akses terbatas untuk melihat dashboard, jadwal & catatan hasil belajar anak'),
    ('44444444-4444-4444-4444-000000000004', 'Staff Administrasi & Keuangan', 'Dapat mengelola rekap penggajian guru & data staff')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'permissions') THEN
    INSERT INTO public.permissions (key, label, group_name) VALUES
    ('dashboard:read', 'Read (Melihat Dashboard Utama)', 'Dashboard Utama'),
    ('presensi:read', 'Read (Melihat Lembar Presensi)', 'Presensi & Check-In AI'),
    ('presensi:create', 'Create (Check-In Presensi AI)', 'Presensi & Check-In AI'),
    ('presensi:update', 'Update (Mengedit Status Presensi)', 'Presensi & Check-In AI'),
    ('presensi:delete', 'Delete (Menghapus Data Presensi)', 'Presensi & Check-In AI'),
    ('jadwal:read', 'Read (Melihat Jadwal Ngajar)', 'Jadwal Ngajar & Sesi'),
    ('jadwal:create', 'Create (Menambah Sesi Jadwal Baru)', 'Jadwal Ngajar & Sesi'),
    ('jadwal:update', 'Update (Mengedit Jam & Pengajar)', 'Jadwal Ngajar & Sesi'),
    ('jadwal:delete', 'Delete (Menghapus Sesi Jadwal)', 'Jadwal Ngajar & Sesi'),
    ('guru:read', 'Read (Melihat Data Guru)', 'Data Guru / Pengajar'),
    ('guru:create', 'Create (Menambah Guru Baru)', 'Data Guru / Pengajar'),
    ('guru:update', 'Update (Mengedit Data Guru)', 'Data Guru / Pengajar'),
    ('guru:delete', 'Delete (Menghapus Data Guru)', 'Data Guru / Pengajar'),
    ('siswa:read', 'Read (Melihat Data Siswa)', 'Data Siswa'),
    ('siswa:create', 'Create (Menambah Siswa Baru)', 'Data Siswa'),
    ('siswa:update', 'Update (Mengedit Data & Catatan Progress)', 'Data Siswa'),
    ('siswa:delete', 'Delete (Menghapus Data Siswa)', 'Data Siswa'),
    ('wali:read', 'Read (Melihat Data Wali)', 'Data Wali Siswa'),
    ('wali:create', 'Create (Menambah Wali Baru)', 'Data Wali Siswa'),
    ('wali:update', 'Update (Mengedit Data Wali)', 'Data Wali Siswa'),
    ('wali:delete', 'Delete (Menghapus Data Wali)', 'Data Wali Siswa'),
    ('staff:read', 'Read (Melihat Data Staff)', 'Data Staff Management'),
    ('staff:create', 'Create (Menambah Staff Baru)', 'Data Staff Management'),
    ('staff:update', 'Update (Mengedit Data Staff)', 'Data Staff Management'),
    ('staff:delete', 'Delete (Menghapus Data Staff)', 'Data Staff Management'),
    ('penggajian:read', 'Read (Melihat Rekap Payroll)', 'Penggajian & Keuangan'),
    ('penggajian:export', 'Export (Export Laporan PDF)', 'Penggajian & Keuangan'),
    ('roles:manage', 'Manage (Atur Role & Ability)', 'Manajemen Peran (RBAC)')
    ON CONFLICT (key) DO NOTHING;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'role_permissions') THEN
    INSERT INTO public.role_permissions (role_id, permission_key) VALUES
    ('11111111-1111-1111-1111-000000000001', 'dashboard:read'), ('11111111-1111-1111-1111-000000000001', 'presensi:read'), ('11111111-1111-1111-1111-000000000001', 'presensi:create'), ('11111111-1111-1111-1111-000000000001', 'presensi:update'), ('11111111-1111-1111-1111-000000000001', 'presensi:delete'),
    ('11111111-1111-1111-1111-000000000001', 'jadwal:read'), ('11111111-1111-1111-1111-000000000001', 'jadwal:create'), ('11111111-1111-1111-1111-000000000001', 'jadwal:update'), ('11111111-1111-1111-1111-000000000001', 'jadwal:delete'),
    ('11111111-1111-1111-1111-000000000001', 'guru:read'), ('11111111-1111-1111-1111-000000000001', 'guru:create'), ('11111111-1111-1111-1111-000000000001', 'guru:update'), ('11111111-1111-1111-1111-000000000001', 'guru:delete'),
    ('11111111-1111-1111-1111-000000000001', 'siswa:read'), ('11111111-1111-1111-1111-000000000001', 'siswa:create'), ('11111111-1111-1111-1111-000000000001', 'siswa:update'), ('11111111-1111-1111-1111-000000000001', 'siswa:delete'),
    ('11111111-1111-1111-1111-000000000001', 'wali:read'), ('11111111-1111-1111-1111-000000000001', 'wali:create'), ('11111111-1111-1111-1111-000000000001', 'wali:update'), ('11111111-1111-1111-1111-000000000001', 'wali:delete'),
    ('11111111-1111-1111-1111-000000000001', 'staff:read'), ('11111111-1111-1111-1111-000000000001', 'staff:create'), ('11111111-1111-1111-1111-000000000001', 'staff:update'), ('11111111-1111-1111-1111-000000000001', 'staff:delete'),
    ('11111111-1111-1111-1111-000000000001', 'penggajian:read'), ('11111111-1111-1111-1111-000000000001', 'penggajian:export'), ('11111111-1111-1111-1111-000000000001', 'roles:manage'),
    ('22222222-2222-2222-2222-000000000002', 'dashboard:read'), ('22222222-2222-2222-2222-000000000002', 'presensi:read'), ('22222222-2222-2222-2222-000000000002', 'presensi:create'), ('22222222-2222-2222-2222-000000000002', 'jadwal:read'), ('22222222-2222-2222-2222-000000000002', 'jadwal:create'), ('22222222-2222-2222-2222-000000000002', 'guru:read'), ('22222222-2222-2222-2222-000000000002', 'siswa:read'), ('22222222-2222-2222-2222-000000000002', 'siswa:create'), ('22222222-2222-2222-2222-000000000002', 'siswa:update'), ('22222222-2222-2222-2222-000000000002', 'wali:read'),
    ('33333333-3333-3333-3333-000000000003', 'dashboard:read'), ('33333333-3333-3333-3333-000000000003', 'presensi:read'), ('33333333-3333-3333-3333-000000000003', 'jadwal:read'), ('33333333-3333-3333-3333-000000000003', 'siswa:read'),
    ('44444444-4444-4444-4444-000000000004', 'dashboard:read'), ('44444444-4444-4444-4444-000000000004', 'guru:read'), ('44444444-4444-4444-4444-000000000004', 'staff:read'), ('44444444-4444-4444-4444-000000000004', 'penggajian:read'), ('44444444-4444-4444-4444-000000000004', 'penggajian:export')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
