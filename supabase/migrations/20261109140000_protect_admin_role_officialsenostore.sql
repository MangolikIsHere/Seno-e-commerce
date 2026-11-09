-- ==============================================================================
-- SENO MARKETPLACE — PROTECT ADMIN ROLE FOR DESIGNATED ACCOUNTS
-- Migration: 20261109140000_protect_admin_role_officialsenostore.sql
-- ==============================================================================

-- 1. Ensure public.protect_profile_role() cannot downgrade designated admin emails
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Designated administrator accounts must NEVER be demoted or changed from 'admin'
  IF NEW.email IN (
    'admin@seno-luxury.com',
    'admin.seno@gmail.com',
    'debnathmangolik@gmail.com',
    'officialsenostore@gmail.com'
  ) THEN
    NEW.role := 'admin';
    RETURN NEW;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow an existing administrator to manage roles, or a trusted
    -- Supabase service-role operation used for controlled bootstrap/admin work.
    -- Normal authenticated users can never change their own role.
    IF NOT public.is_admin()
       AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
      RAISE EXCEPTION 'Only an administrator or trusted service-role operation can change profile roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Ensure officialsenostore@gmail.com has 'admin' role
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'officialsenostore@gmail.com';
