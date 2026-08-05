-- 04_staff.sql: Staff Management Table

DROP TABLE IF EXISTS public.staff CASCADE;

CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    role_title VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and Permissive Policies directly for public.staff
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Staff RLS" ON public.staff;
CREATE POLICY "Allow All Staff RLS" ON public.staff FOR ALL USING (true) WITH CHECK (true);
