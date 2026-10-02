-- ==============================================================================
-- SENO MARKETPLACE — MAKE OFFICIALSENOSTORE@GMAIL.COM ADMIN
-- Migration: 20261002000000_make_officialsenostore_admin.sql
-- ==============================================================================

-- 1. Update public.is_admin() to include officialsenostore@gmail.com
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_jwt_claims jsonb;
  v_role text;
BEGIN
  -- 1. Direct migration sessions or postgres superuser
  IF session_user IN ('postgres', 'supabase_admin') THEN
    RETURN TRUE;
  END IF;

  -- 2. Inspect PostgREST JWT claims for service_role
  BEGIN
    v_jwt_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
    v_role := v_jwt_claims ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  IF v_role = 'service_role'
     OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- 3. Authenticated admin user check
  IF auth.uid() IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (
          role = 'admin'
          OR email IN (
            'admin@seno-luxury.com',
            'admin.seno@gmail.com',
            'debnathmangolik@gmail.com',
            'officialsenostore@gmail.com'
          )
        )
    );
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Update public.handle_new_auth_user() to assign 'admin' role if signing up with designated admin emails
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_initial_role text := 'customer';
BEGIN
  IF NEW.email IN (
    'admin@seno-luxury.com',
    'admin.seno@gmail.com',
    'debnathmangolik@gmail.com',
    'officialsenostore@gmail.com'
  ) THEN
    v_initial_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, role, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    v_initial_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE
      WHEN EXCLUDED.email IN (
        'admin@seno-luxury.com',
        'admin.seno@gmail.com',
        'debnathmangolik@gmail.com',
        'officialsenostore@gmail.com'
      ) THEN 'admin'
      ELSE public.profiles.role
    END,
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END;
  RETURN NEW;
END;
$$;

-- 3. Update existing profile role for officialsenostore@gmail.com
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_role_trigger;

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'officialsenostore@gmail.com';

ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_role_trigger;
