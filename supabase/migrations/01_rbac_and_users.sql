-- 01_rbac_and_users.sql: Roles (UUID), Permissions, User Accounts & Auth Sync Trigger

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if re-running migration cleanly
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;

-- 1. Roles Table (UUID Primary Key for dynamic custom roles)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    key VARCHAR(100) PRIMARY KEY,
    label VARCHAR(150) NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Role Permissions Junction Table (FK UUID to roles.id)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) REFERENCES public.permissions(key) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_key)
);

-- 4. User Accounts & Profiles Table (FK UUID to roles.id)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'Guru' CHECK (category IN ('Pemilik', 'Guru', 'Staff', 'Wali')),
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automatic User Profile Trigger on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, avatar_url, category, role_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Pengguna Baru'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'category', 'Guru'),
    COALESCE((NEW.raw_user_meta_data->>'role_id')::uuid, '22222222-2222-2222-2222-000000000002'::uuid)
  )
  ON CONFLICT (email) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
