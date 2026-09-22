-- ==============================================================================
-- SENO MARKETPLACE — LATE PAYMENT RECONCILIATION
-- Migration: 20260920000002_late_payment_reconciliation.sql
-- ==============================================================================
-- Description:
-- Overrides public.confirm_order_payment to support late authorizations on 
-- cancelled orders, safely re-decrementing inventory or flagging oversells.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id UUID,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_paid_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_inventory RECORD;
  v_oversold BOOLEAN := false;
BEGIN
  -- Row-lock order
  SELECT id, order_number, status, payment_status, total_amount, razorpay_order_id, customer_id, expires_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Idempotency: If already paid, return success immediately without re-processing
  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_already_paid', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'payment_status', 'paid'
    );
  END IF;

  -- Verify amount match if provided
  IF p_paid_amount IS NOT NULL AND v_order.total_amount <> p_paid_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment amount mismatch. Expected: ' || v_order.total_amount || ', Received: ' || p_paid_amount
    );
  END IF;

  -- If order was cancelled (inventory already released), we must attempt to re-reserve it
  IF v_order.status = 'cancelled' THEN
    FOR v_item IN
      SELECT variant_id, quantity
      FROM public.order_items
      WHERE order_id = p_order_id AND variant_id IS NOT NULL
    LOOP
      SELECT quantity INTO v_inventory
      FROM public.inventory
      WHERE variant_id = v_item.variant_id
      FOR UPDATE;
      
      IF v_inventory.quantity < v_item.quantity THEN
        v_oversold := true;
      ELSE
        UPDATE public.inventory
        SET quantity = quantity - v_item.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE variant_id = v_item.variant_id;
      END IF;
    END LOOP;
    
    IF v_oversold THEN
      -- Accept the payment but keep order cancelled, mark for admin refund resolution
      UPDATE public.orders
      SET payment_status = 'paid',
          payment_method = 'razorpay',
          payment_reference = p_razorpay_payment_id,
          razorpay_order_id = COALESCE(v_order.razorpay_order_id, p_razorpay_order_id),
          razorpay_payment_id = p_razorpay_payment_id,
          notes = COALESCE(v_order.notes || E'\n', '') || 'OVERSOLD LATE PAYMENT: Payment authorized after inventory was released. Administrative refund required.',
          updated_at = timezone('utc'::text, now())
      WHERE id = p_order_id;
      
      RETURN jsonb_build_object(
        'success', true,
        'is_already_paid', false,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'status', 'cancelled',
        'payment_status', 'paid',
        'oversold', true,
        'message', 'Payment confirmed but inventory oversold. Marked for admin refund.'
      );
    END IF;
  END IF;

  -- Authoritatively transition order to confirmed & paid (normal flow or successful re-decrement)
  UPDATE public.orders
  SET status = 'confirmed',
      payment_status = 'paid',
      payment_method = 'razorpay',
      payment_reference = p_razorpay_payment_id,
      razorpay_order_id = COALESCE(v_order.razorpay_order_id, p_razorpay_order_id),
      razorpay_payment_id = p_razorpay_payment_id,
      notes = CASE 
                WHEN v_order.status = 'cancelled' THEN COALESCE(v_order.notes || E'\n', '') || 'LATE PAYMENT: Successfully re-allocated inventory.'
                ELSE v_order.notes
              END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_already_paid', false,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'status', 'confirmed',
    'payment_status', 'paid'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;
