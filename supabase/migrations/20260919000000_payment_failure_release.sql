-- ==============================================================================
-- SENO MARKETPLACE — PAYMENT FAILURE INVENTORY RELEASE
-- Migration: 20260919000000_payment_failure_release.sql
-- ==============================================================================
-- Description:
-- Redefines public.record_payment_failure to instantly release inventory
-- by delegating to public.cancel_unpaid_order instead of retaining the reservation.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_payment_failure(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_order RECORD;
  v_cancel_res JSONB;
BEGIN
  SELECT id, order_number, status, payment_status, notes
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- CRITICAL: Never downgrade a legitimately paid order
  IF v_order.payment_status = 'paid' OR v_order.status IN ('confirmed', 'processing', 'partially_shipped', 'shipped', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', true,
      'ignored', true,
      'reason', 'Order is already paid/confirmed. Stale failure event discarded.',
      'order_id', v_order.id,
      'payment_status', v_order.payment_status
    );
  END IF;

  -- If order was already cancelled, do nothing
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'ignored', true,
      'reason', 'Order is already cancelled.',
      'order_id', v_order.id
    );
  END IF;

  -- DELEGATE TO cancel_unpaid_order to safely restore inventory and transition to terminal failure state
  v_cancel_res := public.cancel_unpaid_order(p_order_id, 'payment_failed');

  -- Ensure any additional specific Razorpay notes are appended
  IF p_error_message IS NOT NULL AND p_error_message <> '' THEN
    UPDATE public.orders
    SET notes = COALESCE(notes || E'\n', '') || 'Razorpay payment definitively failed: ' || p_error_message,
        payment_reference = p_razorpay_payment_id
    WHERE id = p_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'status', 'cancelled',
    'payment_status', 'failed',
    'reservation_retained', false,
    'restored_items', v_cancel_res->'restored_items_count'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_failure(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
