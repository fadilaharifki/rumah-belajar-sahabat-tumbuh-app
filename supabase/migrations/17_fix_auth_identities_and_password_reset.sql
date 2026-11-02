-- 17_fix_auth_identities_and_password_reset.sql
-- Memperbaiki relasi auth.identities & kolom token di auth.users

-- 1. Pulihkan kolom token NULL di auth.users agar GoTrue tidak crash saat scan
UPDATE auth.users
SET confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    email_change = COALESCE(email_change, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    is_sso_user = COALESCE(is_sso_user, false),
    is_anonymous = COALESCE(is_anonymous, false);

-- 2. Pulihkan data auth.identities untuk semua akun di auth.users yang belum memiliki identity
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    u.id, -- Tipe UUID
    u.id,
    jsonb_build_object(
        'sub', u.id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
    ),
    'email',
    u.id::text,
    NOW(),
    NOW(),
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- 3. Perbarui fungsi reset_user_password agar selalu mengaitkan auth.identities dan token lengkap
CREATE OR REPLACE FUNCTION public.reset_user_password(target_email TEXT, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_encrypted TEXT;
    v_clean_email TEXT;
    v_existing_name TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(target_email));
    v_encrypted := crypt(new_password, gen_salt('bf', 10));

    -- 1. Coba update record auth.users yang sudah ada
    UPDATE auth.users
    SET encrypted_password = v_encrypted,
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW(),
        role = 'authenticated',
        aud = 'authenticated',
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        email_change = COALESCE(email_change, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        is_sso_user = COALESCE(is_sso_user, false),
        is_anonymous = COALESCE(is_anonymous, false)
    WHERE LOWER(email) = v_clean_email
    RETURNING id INTO v_user_id;

    IF v_user_id IS NOT NULL THEN
        -- Pastikan identity juga tersimpan di auth.identities
        IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                v_user_id,
                v_user_id,
                jsonb_build_object(
                    'sub', v_user_id::text,
                    'email', v_clean_email,
                    'email_verified', true,
                    'phone_verified', false
                ),
                'email',
                v_user_id::text,
                NOW(),
                NOW(),
                NOW()
            );
        ELSE
            UPDATE auth.identities
            SET identity_data = jsonb_build_object(
                    'sub', v_user_id::text,
                    'email', v_clean_email,
                    'email_verified', true,
                    'phone_verified', false
                ),
                updated_at = NOW()
            WHERE user_id = v_user_id;
        END IF;

        -- Pastikan link auth_user_id di public.users terisi
        UPDATE public.users
        SET auth_user_id = v_user_id
        WHERE LOWER(email) = v_clean_email AND (auth_user_id IS NULL OR auth_user_id != v_user_id);

        RETURN TRUE;
    END IF;

    -- 2. Ambil nama dari public.users
    SELECT full_name INTO v_existing_name FROM public.users WHERE LOWER(email) = v_clean_email LIMIT 1;

    -- 3. Jika belum ada di auth.users, buat baru
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
        aud,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change_token_current,
        email_change,
        reauthentication_token,
        is_sso_user,
        is_anonymous
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_clean_email,
        v_encrypted,
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', COALESCE(NULLIF(v_existing_name, ''), 'Pengguna Baru')),
        FALSE,
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        '',
        '',
        '',
        FALSE,
        FALSE
    );

    -- 4. Insert identity ke auth.identities
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_user_id,
            jsonb_build_object(
                'sub', v_user_id::text,
                'email', v_clean_email,
                'email_verified', true,
                'phone_verified', false
            ),
            'email',
            v_user_id::text,
            NOW(),
            NOW(),
            NOW()
        );
    END IF;

    -- 5. Hubungkan auth_user_id di public.users jika belum terhubung
    UPDATE public.users
    SET auth_user_id = v_user_id
    WHERE LOWER(email) = v_clean_email AND (auth_user_id IS NULL OR auth_user_id != v_user_id);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reset_user_password(TEXT, TEXT) TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
