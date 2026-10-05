-- 13_student_status_and_soft_delete.sql: Add status ENUM, is_deleted boolean, and deleted_at timestamp
-- Ensures historical learning logs (session_logs), schedules, and attendance records are never lost.

-- 1. Create ENUM type for student status
DO $$ BEGIN
    CREATE TYPE student_status AS ENUM ('Aktif', 'Nonaktif');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add is_deleted and deleted_at columns with safe defaults
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Add or alter status column to use the student_status ENUM
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.students ADD COLUMN status student_status NOT NULL DEFAULT 'Aktif';
    ELSE
        -- Clean up existing data: fallback null/invalid values to 'Aktif'
        UPDATE public.students 
        SET status = 'Aktif' 
        WHERE status IS NULL OR status NOT IN ('Aktif', 'Nonaktif');

        -- Drop old default first to prevent Postgres 42804 cast error
        ALTER TABLE public.students ALTER COLUMN status DROP DEFAULT;
        
        -- Convert column type to student_status enum
        ALTER TABLE public.students ALTER COLUMN status TYPE student_status USING status::text::student_status;
        
        -- Set new enum default and ensure NOT NULL
        ALTER TABLE public.students ALTER COLUMN status SET DEFAULT 'Aktif'::student_status;
        ALTER TABLE public.students ALTER COLUMN status SET NOT NULL;
    END IF;
END $$;

-- 4. Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);
CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON public.students(is_deleted);
CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON public.students(deleted_at);

-- 5. Update RLS policies
DROP POLICY IF EXISTS "Allow All Students RLS" ON public.students;
CREATE POLICY "Allow All Students RLS" ON public.students FOR ALL USING (true) WITH CHECK (true);
