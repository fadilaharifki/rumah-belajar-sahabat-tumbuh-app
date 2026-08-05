# Panduan Integrasi Supabase DB, Storage & Google Auth

Berikut langkah-langkah praktis menghubungkan aplikasi web **Rumah Belajar Sahabat Tumbuh** ke akun Supabase Anda:

---

## 🔑 1. Dapatkan API Keys Supabase
1. Buka [https://supabase.com](https://supabase.com), buat proyek baru bernama `rumah-belajar-sahabat-tumbuh`.
2. Masuk ke **Project Settings -> API**.
3. Salin **Project URL** dan **`anon` public key**.
4. Tempelkan ke file `.env.local` di folder proyek ini:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

---

## 🗄️ 2. Jalankan Skema Database Migration
1. Buka menu **SQL Editor** di dashboard Supabase.
2. Salin dan jalankan isi file SQL dari folder `supabase/migrations/` secara berurutan:
   - `01_profiles.sql`
   - `02_teachers.sql`
   - `03_students.sql`
   - `04_schedules.sql`
   - `05_attendances.sql`
   - `06_session_logs.sql`
   - `07_payroll.sql`
   - `08_rls_policies.sql`
   - `09_storage_buckets.sql`

---

## 📸 3. Setup Storage Bucket Foto (`avatars`)
1. Buka menu **Storage** di Supabase.
2. Pastikan bucket bernama `avatars` sudah ada (otomatis terbuat dari script `09_storage_buckets.sql`).
3. Pastikan status bucket adalah **Public** agar foto pengajar, siswa, dan selfie presensi dapat diakses publik.

---

## 🔐 4. Setup Login Google OAuth
1. Buka menu **Authentication -> Providers -> Google**.
2. Centang **Enable Google Provider**.
3. Masukkan **Client ID** dan **Client Secret** dari Google Cloud Console.
4. Tambahkan Redirect URL:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-domain.vercel.app/api/auth/callback`
