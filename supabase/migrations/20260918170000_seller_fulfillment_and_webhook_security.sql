-- ==============================================================================
-- SENO MARKETPLACE — SELLER FULFILLMENT & WEBHOOK SECURITY
-- Migration: 20260918170000_seller_fulfillment_and_webhook_security.sql
-- ==============================================================================
-- 1. Tighten RLS on order_items so sellers can ONLY view items where:
--    - seller_id matches their authenticated seller account
--    - AND parent order is authoritatively PAID (payment_status = 'paid')
--    - AND parent order is NOT cancelled
-- 2. Tighten RLS on order_items update so sellers can only update fulfillment
--    status on paid, non-cancelled orders.
-- 3. Ensure service_role has full execute permissions on payment RPCs.
-- ==============================================================================

-- 1. UPDATE RLS: order_items_reseller_select
DROP POLICY IF EXISTS "order_items_reseller_select" ON public.order_items;

CREATE POLICY "order_items_reseller_select"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    seller_id = public.get_current_seller_id()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled')
    )
  );

-- 2. UPDATE RLS: order_items_reseller_update
DROP POLICY IF EXISTS "order_items_reseller_update" ON public.order_items;

CREATE POLICY "order_items_reseller_update"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (
    seller_id = public.get_current_seller_id()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled')
    )
  )
  WITH CHECK (
    seller_id = public.get_current_seller_id()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.payment_status = 'paid'
        AND o.status NOT IN ('cancelled')
    )
  );

-- 3. PERMISSIONS FOR SERVICE ROLE & AUTHENTICATED
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT, NUMERIC) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment_failure(UUID, TEXT, TEXT, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_order(UUID, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_razorpay_order_id(UUID, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders(INT) TO service_role, authenticated;
