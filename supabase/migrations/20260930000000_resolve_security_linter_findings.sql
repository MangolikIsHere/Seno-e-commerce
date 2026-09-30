-- ==============================================================================
-- SENO MARKETPLACE — SECURITY LINTER REMEDIATION
-- Migration: 20260930000000_resolve_security_linter_findings.sql
-- 
-- Resolves:
-- 1. security_definer_view on public.sellers_public (Lint 0010)
--    Uses a hardened SECURITY DEFINER projection function and re-defines
--    sellers_public with (security_invoker = true), preserving least privilege,
--    preventing private financial/PII leakage from public.sellers, and maintaining
--    full storefront backward compatibility.
-- 2. rls_disabled_in_public on public.fulfillment_events (Lint 0008)
--    Enables RLS on public.fulfillment_events, revokes public/anon grants,
--    and establishes strict least-privilege policies for admins, customers,
--    and authorized sellers.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RESOLVE security_definer_view: public.sellers_public
-- ------------------------------------------------------------------------------

-- Create security-hardened function that strictly projects only public storefront fields
-- for approved sellers with schema isolation and explicit search path.
CREATE OR REPLACE FUNCTION public.get_sellers_public()
RETURNS TABLE (
  id UUID,
  store_name TEXT,
  slug TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    s.id,
    s.store_name,
    s.slug,
    s.description,
    s.logo_url,
    s.banner_url,
    s.created_at
  FROM public.sellers s
  WHERE s.seller_status = 'approved';
$$;

-- Restrict function execution to intended roles
REVOKE ALL ON FUNCTION public.get_sellers_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sellers_public() TO anon, authenticated, service_role;

-- Re-create public.sellers_public view with security_invoker = true
CREATE OR REPLACE VIEW public.sellers_public
WITH (security_invoker = true) AS
SELECT
  id,
  store_name,
  slug,
  description,
  logo_url,
  banner_url,
  created_at
FROM public.get_sellers_public();

-- Grant SELECT on the view to anon and authenticated
GRANT SELECT ON public.sellers_public TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 2. RESOLVE rls_disabled_in_public: public.fulfillment_events
-- ------------------------------------------------------------------------------

-- Enable Row Level Security
ALTER TABLE public.fulfillment_events ENABLE ROW LEVEL SECURITY;

-- Revoke all direct privileges from anonymous users (Defense in Depth)
REVOKE ALL ON public.fulfillment_events FROM anon;

-- Ensure authenticated role has SELECT privilege (governed by RLS policies below)
GRANT SELECT ON public.fulfillment_events TO authenticated;

-- Drop any existing policies to ensure idempotency
DROP POLICY IF EXISTS "fulfillment_events_admin_all" ON public.fulfillment_events;
DROP POLICY IF EXISTS "fulfillment_events_customer_select" ON public.fulfillment_events;
DROP POLICY IF EXISTS "fulfillment_events_seller_select" ON public.fulfillment_events;

-- Policy A: Administrators have full access
CREATE POLICY "fulfillment_events_admin_all"
  ON public.fulfillment_events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy B: Customers can view fulfillment events for items in their own orders
CREATE POLICY "fulfillment_events_customer_select"
  ON public.fulfillment_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = fulfillment_events.order_item_id
        AND o.customer_id = auth.uid()
    )
  );

-- Policy C: Sellers can view fulfillment events for items they sell on paid, active orders
CREATE POLICY "fulfillment_events_seller_select"
  ON public.fulfillment_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = fulfillment_events.order_item_id
        AND oi.seller_id = public.get_current_seller_id()
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled')
    )
  );
