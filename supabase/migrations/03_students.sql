-- 03_students.sql: Students Table with Safe FK Parent Relationship (SET NULL on delete)

DROP TABLE IF EXISTS public.students CASCADE;

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    grade VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    notes TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_parent_id ON public.students(parent_id);

-- Enable RLS and Permissive Policies directly for public.students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Students RLS" ON public.students;
CREATE POLICY "Allow All Students RLS" ON public.students FOR ALL USING (true) WITH CHECK (true);
