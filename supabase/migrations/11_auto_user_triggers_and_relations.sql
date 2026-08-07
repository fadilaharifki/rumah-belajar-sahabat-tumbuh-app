-- 11_auto_user_triggers_and_relations.sql: Automatic User Creation & Deletion Triggers + Foreign Key Sync + Guaranteed Password Reset Function

-- 1. Trigger Function for Teachers -> public.users (INSERT)
CREATE OR REPLACE FUNCTION public.handle_teacher_auto_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    INSERT INTO public.users (email, full_name, phone, category, role_id, status)
    VALUES (
      LOWER(TRIM(NEW.email)),
      NEW.name,
      NEW.phone,
      'Guru',
      '22222222-2222-2222-2222-000000000002'::uuid,
      'Aktif'
    )
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone
    RETURNING id INTO v_user_id;

    NEW.user_id := v_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_teacher_auto_user ON public.teachers;
CREATE TRIGGER trg_teacher_auto_user
  BEFORE INSERT ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.handle_teacher_auto_user();


-- 2. Trigger Function for Staff -> public.users (INSERT)
CREATE OR REPLACE FUNCTION public.handle_staff_auto_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    INSERT INTO public.users (email, full_name, phone, category, role_id, status)
    VALUES (
      LOWER(TRIM(NEW.email)),
      NEW.name,
      NEW.phone,
      'Staff',
      '44444444-4444-4444-4444-000000000004'::uuid,
      'Aktif'
    )
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone
    RETURNING id INTO v_user_id;

    NEW.user_id := v_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_staff_auto_user ON public.staff;
CREATE TRIGGER trg_staff_auto_user
  BEFORE INSERT ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.handle_staff_auto_user();


-- 3. Trigger Function for Parents (Wali) -> public.users (INSERT)
CREATE OR REPLACE FUNCTION public.handle_parent_auto_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_email VARCHAR(255);
BEGIN
  v_email := LOWER(TRIM(COALESCE(NEW.email, 'wali.' || replace(gen_random_uuid()::text, '-', '') || '@rbst.com')));
  IF NEW.email IS NULL THEN
    NEW.email := v_email;
  END IF;

  IF NEW.user_id IS NULL THEN
    INSERT INTO public.users (email, full_name, phone, category, role_id, status)
    VALUES (
      v_email,
      NEW.name,
      NEW.phone,
      'Wali',
      '33333333-3333-3333-3333-000000000003'::uuid,
      'Aktif'
    )
    ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone
    RETURNING id INTO v_user_id;

    NEW.user_id := v_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_parent_auto_user ON public.parents;
CREATE TRIGGER trg_parent_auto_user
  BEFORE INSERT ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.handle_parent_auto_user();


-- 4. Trigger Function for Staff -> public.users (DELETE CASCADE)
CREATE OR REPLACE FUNCTION public.handle_staff_auto_delete_user()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = OLD.user_id;
  ELSIF OLD.email IS NOT NULL THEN
    DELETE FROM public.users WHERE LOWER(email) = LOWER(OLD.email);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_staff_auto_delete_user ON public.staff;
CREATE TRIGGER trg_staff_auto_delete_user
  AFTER DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.handle_staff_auto_delete_user();


-- 5. Trigger Function for Teachers -> public.users (DELETE CASCADE)
CREATE OR REPLACE FUNCTION public.handle_teacher_auto_delete_user()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = OLD.user_id;
  ELSIF OLD.email IS NOT NULL THEN
    DELETE FROM public.users WHERE LOWER(email) = LOWER(OLD.email);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_teacher_auto_delete_user ON public.teachers;
CREATE TRIGGER trg_teacher_auto_delete_user
  AFTER DELETE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.handle_teacher_auto_delete_user();


-- 6. Trigger Function for Parents -> public.users (DELETE CASCADE)
CREATE OR REPLACE FUNCTION public.handle_parent_auto_delete_user()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_id IS NOT NULL THEN
    DELETE FROM public.users WHERE id = OLD.user_id;
  ELSIF OLD.email IS NOT NULL THEN
    DELETE FROM public.users WHERE LOWER(email) = LOWER(OLD.email);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_parent_auto_delete_user ON public.parents;
CREATE TRIGGER trg_parent_auto_delete_user
  AFTER DELETE ON public.parents
  FOR EACH ROW EXECUTE FUNCTION public.handle_parent_auto_delete_user();


-- 7. Trigger Function for public.users -> auth.users (DELETE CASCADE TO SUPABASE AUTH)
CREATE OR REPLACE FUNCTION public.handle_user_auto_delete_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.auth_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = OLD.auth_user_id;
  ELSIF OLD.email IS NOT NULL THEN
    DELETE FROM auth.users WHERE LOWER(email) = LOWER(OLD.email);
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_user_auto_delete_auth ON public.users;
CREATE TRIGGER trg_user_auto_delete_auth
  AFTER DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_auto_delete_auth();


-- 8. Guaranteed Function to Reset Password & Instantly Confirm Email in Supabase Auth (bcrypt cost factor 10)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.reset_user_password(target_email TEXT, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_encrypted TEXT;
    v_clean_email TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(target_email));
    v_encrypted := crypt(new_password, gen_salt('bf', 10));

    -- 1. Try updating existing record in auth.users and auto-confirm email + role/aud
    UPDATE auth.users
    SET encrypted_password = v_encrypted,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW(),
        role = 'authenticated',
        aud = 'authenticated'
    WHERE LOWER(email) = v_clean_email;

    IF FOUND THEN
        RETURN TRUE;
    END IF;

    -- 2. If user does NOT exist in auth.users, insert new active confirmed account
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_clean_email,
        v_encrypted,
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        FALSE,
        'authenticated',
        'authenticated'
    );

    -- Link auth_user_id back to public.users
    UPDATE public.users
    SET auth_user_id = v_user_id,
        updated_at = NOW()
    WHERE LOWER(email) = v_clean_email;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify PostgREST engine to instantly refresh schema cache & functions
NOTIFY pgrst, 'reload schema';

