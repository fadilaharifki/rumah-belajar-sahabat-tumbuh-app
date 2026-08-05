-- 08_payrolls.sql: Teacher Payroll & Honorarium Recap Table with Default 'Draft' Status

CREATE TABLE IF NOT EXISTS public.payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL,
    period_month VARCHAR(7) NOT NULL, -- Format: '2026-08'
    total_sessions INTEGER NOT NULL DEFAULT 0,
    rate_per_session NUMERIC(12, 2) NOT NULL DEFAULT 85000,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Lunas', 'Pending', 'Calculated')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure explicit Foreign Key constraint name for PostgREST schema cache recognition
ALTER TABLE public.payrolls DROP CONSTRAINT IF EXISTS fk_payrolls_teacher;
ALTER TABLE public.payrolls 
  ADD CONSTRAINT fk_payrolls_teacher 
  FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;

-- Ensure Unique Index exists even if table was already created previously
CREATE UNIQUE INDEX IF NOT EXISTS idx_payrolls_teacher_period ON public.payrolls(teacher_id, period_month);
CREATE INDEX IF NOT EXISTS idx_payrolls_period ON public.payrolls(period_month);

-- RLS Policies for payrolls
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read payrolls" ON public.payrolls;
CREATE POLICY "Allow authenticated read payrolls"
  ON public.payrolls FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow admin modify payrolls" ON public.payrolls;
CREATE POLICY "Allow admin modify payrolls"
  ON public.payrolls FOR ALL
  TO authenticated, anon
  USING (true);

-- 1. Real-Time Trigger Function: Instantly populate & update payrolls table with DEFAULT 'Draft' status!
CREATE OR REPLACE FUNCTION public.sync_payroll_on_attendance()
RETURNS TRIGGER AS $$
DECLARE
    v_month VARCHAR(7);
    v_sessions INT;
    v_rate NUMERIC;
BEGIN
    v_month := to_char(NEW.date::date, 'YYYY-MM');

    -- Count total attendance for this teacher & month
    SELECT COUNT(*) INTO v_sessions 
    FROM public.attendance_records 
    WHERE teacher_id = NEW.teacher_id AND to_char(date::date, 'YYYY-MM') = v_month;

    -- Fetch teacher session rate
    SELECT COALESCE(session_rate, 85000) INTO v_rate 
    FROM public.teachers 
    WHERE id = NEW.teacher_id;

    -- Upsert payrolls record with default 'Draft' status
    INSERT INTO public.payrolls (teacher_id, period_month, total_sessions, rate_per_session, total_amount, status)
    VALUES (
      NEW.teacher_id,
      v_month,
      v_sessions,
      COALESCE(v_rate, 85000),
      v_sessions * COALESCE(v_rate, 85000),
      'Draft'
    )
    ON CONFLICT (teacher_id, period_month) DO UPDATE
    SET total_sessions = EXCLUDED.total_sessions,
        rate_per_session = EXCLUDED.rate_per_session,
        total_amount = EXCLUDED.total_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_payroll_on_attendance ON public.attendance_records;
CREATE TRIGGER trg_sync_payroll_on_attendance
  AFTER INSERT OR UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.sync_payroll_on_attendance();


-- 2. Auto-Seed Script: Populate payrolls table with DEFAULT 'Draft' status
DO $$
DECLARE
    rec RECORD;
    v_sessions INT;
    v_rate NUMERIC;
    v_total NUMERIC;
BEGIN
    FOR rec IN 
        SELECT DISTINCT teacher_id, to_char(date::date, 'YYYY-MM') as month_period 
        FROM public.attendance_records
    LOOP
        -- Calculate actual total sessions for this teacher & month
        SELECT COUNT(*) INTO v_sessions 
        FROM public.attendance_records 
        WHERE teacher_id = rec.teacher_id AND to_char(date::date, 'YYYY-MM') = rec.month_period;

        -- Fetch teacher's session rate
        SELECT COALESCE(session_rate, 85000) INTO v_rate 
        FROM public.teachers 
        WHERE id = rec.teacher_id;

        v_total := v_sessions * COALESCE(v_rate, 85000);

        -- Upsert record into public.payrolls DB table with DEFAULT 'Draft' status
        INSERT INTO public.payrolls (teacher_id, period_month, total_sessions, rate_per_session, total_amount, status)
        VALUES (rec.teacher_id, rec.month_period, v_sessions, COALESCE(v_rate, 85000), v_total, 'Draft')
        ON CONFLICT (teacher_id, period_month) DO UPDATE
        SET total_sessions = EXCLUDED.total_sessions,
            rate_per_session = EXCLUDED.rate_per_session,
            total_amount = EXCLUDED.total_amount;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
