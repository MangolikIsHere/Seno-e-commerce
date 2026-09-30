-- ==============================================================================
-- SENO MARKETPLACE — FIX PUBLIC.IS_ADMIN() FOR SERVICE_ROLE AND ADMIN ACCOUNTS
-- Migration: 20261001000001_fix_is_admin_service_role.sql
-- ==============================================================================
-- Description:
-- Fixes public.is_admin() to properly recognize service_role credentials in PostgREST.
-- In PostgREST, request.jwt.claims is provided as a JSON string, not request.jwt.claim.role.
-- Previous implementation caused public.is_admin() to evaluate to FALSE during service_role
-- admin actions, triggering trg_enforce_product_rules exception:
-- "Resellers cannot self-approve products. Please submit for admin review."
-- and resulting in React Error #441 (Server Component/Server Action rendering failure).
-- ==============================================================================

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
          OR email IN ('admin@seno-luxury.com', 'admin.seno@gmail.com', 'debnathmangolik@gmail.com')
        )
    );
  END IF;

  RETURN FALSE;
END;
$$;

-- Ensure administrative accounts have the 'admin' role in profiles
ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_role_trigger;

UPDATE public.profiles
SET role = 'admin'
WHERE email IN ('admin.seno@gmail.com', 'debnathmangolik@gmail.com') AND role <> 'admin';

ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_role_trigger;
