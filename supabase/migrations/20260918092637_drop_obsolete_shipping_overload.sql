-- SENO: Fix RPC ambiguity
-- Drops the obsolete 2-argument overload of calculate_shipping,
-- leaving the 3-argument version (which has a DEFAULT 3rd argument) as the authoritative version.

DROP FUNCTION IF EXISTS public.calculate_shipping(NUMERIC, NUMERIC);
