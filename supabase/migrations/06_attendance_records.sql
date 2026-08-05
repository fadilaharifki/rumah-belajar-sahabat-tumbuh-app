-- 06_attendance_records.sql: Single Check-In Attendance Records (Clean Single Foreign Keys)

DROP TABLE IF EXISTS public.attendance_records CASCADE;

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL,
    student_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIME NOT NULL DEFAULT CURRENT_TIME,
    check_out TIME,
    duration_minutes INTEGER DEFAULT 60,
    checkin_photo_url TEXT,
    verified_ai BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'CheckIn' CHECK (status IN ('CheckIn', 'Valid', 'ManualVerified')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_attendance_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher_id ON public.attendance_records(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance_records(student_id);

-- Enable RLS and Permissive Policies directly
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Attendance Records RLS" ON public.attendance_records;
CREATE POLICY "Allow All Attendance Records RLS" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

-- Notify PostgREST engine to instantly refresh schema cache & relationships
NOTIFY pgrst, 'reload schema';
