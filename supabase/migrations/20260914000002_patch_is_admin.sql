-- Fix public.is_admin() to allow service-role/migrations to bypass reseller checks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  -- Treat Supabase backend services and migrations as admins
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;
