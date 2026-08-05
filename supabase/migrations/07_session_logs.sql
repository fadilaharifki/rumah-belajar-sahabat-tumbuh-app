-- 07_session_logs.sql: Session Logs & Learning Progress Notes with Auto-Seed for Students

DROP TABLE IF EXISTS public.session_logs CASCADE;

CREATE TABLE IF NOT EXISTS public.session_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_id UUID REFERENCES public.attendance_records(id) ON DELETE SET NULL,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL DEFAULT 1,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME NOT NULL DEFAULT '14:00',
    end_time TIME NOT NULL DEFAULT '15:30',
    activities TEXT NOT NULL,
    results_recommendations TEXT NOT NULL,
    session_fee NUMERIC(12, 2) NOT NULL DEFAULT 85000,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_session_logs_teacher FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_logs_student FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_logs_attendance FOREIGN KEY (attendance_id) REFERENCES public.attendance_records(id) ON DELETE SET NULL
);

-- Safely add column if table already exists
ALTER TABLE public.session_logs ADD COLUMN IF NOT EXISTS session_number INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_session_logs_student_id ON public.session_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_session_logs_attendance_id ON public.session_logs(attendance_id);

-- Enable RLS and Permissive Policies directly
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Session Logs RLS" ON public.session_logs;
CREATE POLICY "Allow All Session Logs RLS" ON public.session_logs FOR ALL USING (true) WITH CHECK (true);

-- Automatic Trigger: Update paired attendance_records.status = 'Valid' when session_log is created
CREATE OR REPLACE FUNCTION public.handle_auto_validate_attendance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.attendance_id IS NOT NULL THEN
        UPDATE public.attendance_records
        SET status = 'Valid'
        WHERE id = NEW.attendance_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_validate_attendance ON public.session_logs;
CREATE TRIGGER trg_auto_validate_attendance
AFTER INSERT OR UPDATE ON public.session_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_auto_validate_attendance();

-- Auto Seed Initial Sample Session Log for All Existing Students
DO $$
DECLARE
    v_teacher_id UUID;
    v_studentRECORD RECORD;
BEGIN
    SELECT id INTO v_teacher_id FROM public.teachers LIMIT 1;

    IF v_teacher_id IS NOT NULL THEN
        FOR v_studentRECORD IN SELECT id, name FROM public.students LOOP
            INSERT INTO public.session_logs (
                teacher_id,
                student_id,
                session_number,
                session_date,
                start_time,
                end_time,
                activities,
                results_recommendations,
                verified
            ) VALUES (
                v_teacher_id,
                v_studentRECORD.id,
                1,
                CURRENT_DATE - INTERVAL '1 day',
                '14:00',
                '15:30',
                'Pendampingan Belajar Dasar & Latihan Pengenalan Materi',
                'Ananda ' || v_studentRECORD.name || ' menunjukkan perkembangan positif, mampu mengikuti instruksi dengan baik.',
                TRUE
            );
        END LOOP;
    END IF;
END $$;

-- Notify PostgREST engine to instantly refresh schema cache & relationships
NOTIFY pgrst, 'reload schema';
