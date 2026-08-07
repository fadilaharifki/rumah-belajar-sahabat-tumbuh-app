-- 12_sync_user_email_function.sql: Automatic Bi-Directional Email & Name Sync Function for Supabase Authentication & Public Tables

CREATE OR REPLACE FUNCTION public.sync_user_email(old_email TEXT, new_email TEXT, new_name TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_old TEXT;
  v_new TEXT;
BEGIN
  v_old := LOWER(TRIM(old_email));
  v_new := LOWER(TRIM(new_email));

  IF v_old IS NULL OR v_new IS NULL OR v_old = '' OR v_new = '' THEN
    RETURN FALSE;
  END IF;

  -- 1. Update auth.users email & metadata in Supabase Authentication schema
  UPDATE auth.users
  SET email = v_new,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW(),
      raw_user_meta_data = CASE
        WHEN new_name IS NOT NULL AND new_name != '' THEN
          jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{full_name}', to_jsonb(new_name))
        ELSE raw_user_meta_data
      END
  WHERE LOWER(email) = v_old;

  -- 2. Update public.users email & full_name
  UPDATE public.users
  SET email = v_new,
      full_name = COALESCE(NULLIF(new_name, ''), full_name)
  WHERE LOWER(email) = v_old;

  -- 3. Update teachers email & name
  UPDATE public.teachers
  SET email = v_new,
      name = COALESCE(NULLIF(new_name, ''), name)
  WHERE LOWER(email) = v_old;

  -- 4. Update parents email & name
  UPDATE public.parents
  SET email = v_new,
      name = COALESCE(NULLIF(new_name, ''), name)
  WHERE LOWER(email) = v_old;

  -- 5. Update staff email & name
  UPDATE public.staff
  SET email = v_new,
      name = COALESCE(NULLIF(new_name, ''), name)
  WHERE LOWER(email) = v_old;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to authenticated & service_role users
GRANT EXECUTE ON FUNCTION public.sync_user_email(TEXT, TEXT, TEXT) TO authenticated, service_role, anon;

-- 10. Update Trigger for Parent Auto User Generation using Parent Name + Multi-Table Unique Check
CREATE OR REPLACE FUNCTION public.handle_parent_auto_user()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_clean_name TEXT;
  v_email VARCHAR(255);
  v_exists BOOLEAN;
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    v_clean_name := LOWER(REGEXP_REPLACE(COALESCE(NEW.name, 'wali'), '[^a-zA-Z0-9]', '', 'g'));
    IF v_clean_name = '' THEN v_clean_name := 'wali'; END IF;
    v_email := 'wali.' || v_clean_name || '@rbst.com';
  ELSE
    v_email := LOWER(TRIM(NEW.email));
  END IF;

  -- Multi-table duplicate check across public.users, parents, teachers, staff
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE LOWER(email) = LOWER(v_email)
    UNION ALL
    SELECT 1 FROM public.parents WHERE LOWER(email) = LOWER(v_email) AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    UNION ALL
    SELECT 1 FROM public.teachers WHERE LOWER(email) = LOWER(v_email)
    UNION ALL
    SELECT 1 FROM public.staff WHERE LOWER(email) = LOWER(v_email)
  ) INTO v_exists;

  IF v_exists THEN
    v_email := SPLIT_PART(v_email, '@', 1) || '.' || RIGHT(FLOOR(EXTRACT(EPOCH FROM NOW()))::text, 4) || '@rbst.com';
  END IF;

  NEW.email := v_email;

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

-- Notify PostgREST engine to instantly refresh schema cache & functions
NOTIFY pgrst, 'reload schema';
