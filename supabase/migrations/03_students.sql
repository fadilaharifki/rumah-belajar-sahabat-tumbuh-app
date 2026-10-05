-- 03_students.sql: Students Table with Safe FK Parent Relationship, Status ENUM, and Soft Delete (is_deleted & deleted_at)

DROP TABLE IF EXISTS public.students CASCADE;

-- Create student_status ENUM
DO $$ BEGIN
    CREATE TYPE student_status AS ENUM ('Aktif', 'Nonaktif');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100),
    grade VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    status student_status NOT NULL DEFAULT 'Aktif',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    notes TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_parent_id ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON public.students(is_deleted);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

-- Enable RLS and Permissive Policies directly for public.students
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Students RLS" ON public.students;
CREATE POLICY "Allow All Students RLS" ON public.students FOR ALL USING (true) WITH CHECK (true);
