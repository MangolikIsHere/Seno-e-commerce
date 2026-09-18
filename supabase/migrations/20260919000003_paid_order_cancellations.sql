-- Migration: 20260919000003_paid_order_cancellations.sql
-- Description: Adds RPCs for securely cancelling paid order items, initiating refunds, and reversing commissions.

-- 1. RPC for Seller to Cancel a Paid Order Item
CREATE OR REPLACE FUNCTION public.cancel_paid_order_item(
  p_order_item_id UUID,
  p_seller_id UUID,
  p_reason TEXT DEFAULT 'Seller cancelled'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_item RECORD;
  v_order RECORD;
  v_refund_event_id TEXT;
  v_existing_event RECORD;
  v_all_items_cancelled BOOLEAN;
BEGIN
  -- 1. Ensure seller owns the item and fetch details
  SELECT * INTO v_item
  FROM public.order_items
  WHERE id = p_order_item_id AND seller_id = p_seller_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Order item not found or you do not have permission to modify it.';
  END IF;

  IF v_item.fulfillment_status IN ('cancelled', 'returned') THEN
    RAISE EXCEPTION 'Item is already cancelled or returned.';
  END IF;

  -- 2. Fetch parent order to ensure it's paid
  SELECT id, status, payment_status, razorpay_order_id, razorpay_payment_id
  INTO v_order
  FROM public.orders
  WHERE id = v_item.order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Parent order not found.';
  END IF;

  IF v_order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'This RPC is strictly for PAID orders. Use unpaid cancellation for others.';
  END IF;

  -- 3. Idempotency Check: Do we already have a refund event for this item?
  v_refund_event_id := 'refund_req_' || p_order_item_id::text;
  
  SELECT * INTO v_existing_event
  FROM public.payment_events
  WHERE event_id = v_refund_event_id;

  IF v_existing_event.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_already_requested', true,
      'refund_event_id', v_existing_event.id,
      'razorpay_payment_id', v_order.razorpay_payment_id,
      'refundable_amount', v_item.total_price
    );
  END IF;

  -- 4. Reverse the commission and payout on the item level, and mark it cancelled
  UPDATE public.order_items
  SET fulfillment_status = 'cancelled',
      seller_payout_amount = 0,
      commission_amount = 0
  WHERE id = p_order_item_id;

  -- 5. Record the Refund Event (Pending state)
  INSERT INTO public.payment_events (
    event_id,
    order_id,
    razorpay_order_id,
    razorpay_payment_id,
    event_type,
    payload,
    processing_status
  ) VALUES (
    v_refund_event_id,
    v_order.id,
    v_order.razorpay_order_id,
    v_order.razorpay_payment_id,
    'refund',
    jsonb_build_object('order_item_id', p_order_item_id, 'amount', v_item.total_price, 'reason', p_reason),
    'pending'
  ) RETURNING id INTO v_existing_event.id;

  -- 6. Check if ALL items in the order are now cancelled
  SELECT NOT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = v_order.id AND fulfillment_status <> 'cancelled'
  ) INTO v_all_items_cancelled;

  -- If all items cancelled, update parent order status
  IF v_all_items_cancelled THEN
    UPDATE public.orders
    SET status = 'cancelled'
    -- Note: We don't set payment_status to 'refunded' here; that happens when Razorpay confirms the refund.
    WHERE id = v_order.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_already_requested', false,
    'refund_event_id', v_existing_event.id,
    'razorpay_payment_id', v_order.razorpay_payment_id,
    'refundable_amount', v_item.total_price
  );
END;
$$;

-- 2. RPC to Update Refund Status after Razorpay API Call or Webhook
CREATE OR REPLACE FUNCTION public.update_refund_status(
  p_refund_event_id UUID,
  p_status TEXT, -- 'processed', 'failed'
  p_razorpay_refund_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_event RECORD;
  v_order_id UUID;
  v_all_refunded BOOLEAN;
  v_all_cancelled BOOLEAN;
BEGIN
  -- 1. Lock and fetch event
  SELECT * INTO v_event
  FROM public.payment_events
  WHERE id = p_refund_event_id
  FOR UPDATE;

  IF v_event.id IS NULL THEN
    RAISE EXCEPTION 'Refund event not found.';
  END IF;

  IF v_event.processing_status = 'processed' AND p_status = 'processed' THEN
    RETURN jsonb_build_object('success', true, 'is_already_processed', true);
  END IF;

  v_order_id := v_event.order_id;

  -- 2. Update the event
  UPDATE public.payment_events
  SET processing_status = p_status,
      error_message = COALESCE(p_error_message, error_message),
      processed_at = timezone('utc'::text, now()),
      payload = payload || jsonb_build_object('razorpay_refund_id', p_razorpay_refund_id)
  WHERE id = p_refund_event_id;

  -- 3. If processed, check if entire order should be marked as refunded
  IF p_status = 'processed' THEN
    -- If all items are cancelled AND all corresponding refund events are processed, then the whole order is refunded
    SELECT NOT EXISTS (
      SELECT 1 FROM public.order_items
      WHERE order_id = v_order_id AND fulfillment_status <> 'cancelled'
    ) INTO v_all_cancelled;

    IF v_all_cancelled THEN
      -- Are all refund events processed?
      SELECT NOT EXISTS (
        SELECT 1 FROM public.payment_events
        WHERE order_id = v_order_id AND event_type = 'refund' AND processing_status <> 'processed'
      ) INTO v_all_refunded;

      IF v_all_refunded THEN
        UPDATE public.orders
        SET payment_status = 'refunded'
        WHERE id = v_order_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_paid_order_item(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_refund_status(UUID, TEXT, TEXT, TEXT) TO service_role;
