-- 02_parents_and_teachers.sql: Parents (Wali Siswa) & Teachers (Guru) Tables

DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.parents CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;

-- Parents Table
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers Table
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    session_rate NUMERIC(12, 2) NOT NULL DEFAULT 85000,
    photo_url TEXT,
    subjects TEXT[] DEFAULT ARRAY['Umum', 'Pendampingan'],
    status VARCHAR(20) NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and Permissive Policies directly
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Parents RLS" ON public.parents;
CREATE POLICY "Allow All Parents RLS" ON public.parents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Teachers RLS" ON public.teachers;
CREATE POLICY "Allow All Teachers RLS" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
