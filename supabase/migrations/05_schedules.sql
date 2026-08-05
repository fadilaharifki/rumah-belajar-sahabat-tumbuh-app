-- 05_schedules.sql: Schedules Table (Jadwal Ngajar) with Explicit Constraints

DROP TABLE IF EXISTS public.schedules CASCADE;

CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    student_id UUID NOT NULL,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100) DEFAULT 'Ruang Utama',
    status VARCHAR(20) DEFAULT 'Aktif',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_schedules_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_schedules_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedules_teacher_id ON public.schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON public.schedules(student_id);

-- Enable RLS and Permissive Policies directly
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Schedules RLS" ON public.schedules;
CREATE POLICY "Allow All Schedules RLS" ON public.schedules FOR ALL USING (true) WITH CHECK (true);

-- Notify PostgREST engine to instantly refresh schema cache & relationships
NOTIFY pgrst, 'reload schema';
