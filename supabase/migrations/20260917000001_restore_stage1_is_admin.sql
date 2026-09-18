-- Restore Stage 1 is_admin() implementation
-- Fix critical bug where current_user was checked inside SECURITY DEFINER function
-- (In PostgreSQL, current_user inside a SECURITY DEFINER function is always the function owner 'postgres',
-- which inadvertently caused every user to evaluate as an admin).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  -- Backend direct migration sessions or service-role operations
  IF session_user IN ('postgres', 'supabase_admin')
     OR COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
