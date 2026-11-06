-- ============================================================================
-- 19_add_presensi_bypass_schedule_permission.sql
-- Menambahkan Permission RBAC Baru: presensi:bypass_schedule
-- Memungkinkan Superadmin / Role yang diberi izin untuk:
-- 1. Melakukan Check-In di luar jadwal rutin siswa (Sesi Tambahan / Pengganti / Khusus)
-- 2. Memilih tanggal sesi secara fleksibel (Backdate / Input Susulan Absensi)
-- ============================================================================

-- 1. Daftarkan permission baru ke public.permissions
INSERT INTO public.permissions (key, label, group_name)
VALUES (
    'presensi:bypass_schedule',
    'Bypass Jadwal & Bebas Waktu Check-In (Sesi Khusus/Pengganti)',
    'Presensi & Check-In AI'
)
ON CONFLICT (key) DO UPDATE 
SET label = EXCLUDED.label, 
    group_name = EXCLUDED.group_name;

-- 2. Berikan izin presensi:bypass_schedule ke role Pemilik / Admin Utama secara default
INSERT INTO public.role_permissions (role_id, permission_key)
VALUES ('11111111-1111-1111-1111-000000000001', 'presensi:bypass_schedule')
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- 3. Beritahu engine PostgREST agar merefresh skema cache
NOTIFY pgrst, 'reload schema';

