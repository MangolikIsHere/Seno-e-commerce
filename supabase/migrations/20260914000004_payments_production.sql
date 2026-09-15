-- ==============================================================================
-- SENO MARKETPLACE — PHASE 3: PAYMENTS + PRODUCTION FOUNDATION
-- Migration: 20260914000004_payments_production.sql
-- ==============================================================================
-- Description:
-- 1. Adds gateway reference and reservation expiration columns to public.orders.
-- 2. Creates public.payment_events audit table for webhook idempotency and replay protection.
-- 3. Defines concurrency-safe public.attach_razorpay_order_id RPC.
-- 4. Defines server-authoritative public.confirm_order_payment RPC (idempotent, no double decrement).
-- 5. Defines public.record_payment_failure RPC (protects paid orders from stale downgrades, keeps reservation).
-- 6. Defines public.cancel_unpaid_order RPC (atomic, single inventory restoration, idempotent).
-- 7. Defines public.expire_unpaid_orders RPC (batch, concurrency-safe SKIP LOCKED).
-- 8. Defines public.record_order_refund RPC (preserves historical commission/payout snapshots).
-- ==============================================================================

-- 1. EXTEND ORDERS TABLE WITH PAYMENT GATEWAY & EXPIRATION FIELDS
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '30 minutes');

-- Ensure razorpay_order_id is unique across orders when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_orders_razorpay_order_id'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT uq_orders_razorpay_order_id UNIQUE (razorpay_order_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON public.orders(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON public.orders(expires_at) WHERE status = 'pending';

-- 2. CREATE PAYMENT EVENTS AUDIT TABLE (Webhooks & Gateway Events)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  processed_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_payment_events_event_id'
  ) THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT uq_payment_events_event_id UNIQUE (event_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_razorpay_order_id ON public.payment_events(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_razorpay_payment_id ON public.payment_events(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON public.payment_events(event_type);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_events_admin_all"
  ON public.payment_events
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. CONCURRENCY-SAFE RAZORPAY ORDER ID ATTACHMENT
CREATE OR REPLACE FUNCTION public.attach_razorpay_order_id(
  p_order_id UUID,
  p_razorpay_order_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Row-lock order
  SELECT id, order_number, status, payment_status, total_amount, razorpay_order_id, expires_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot attach payment to a cancelled order');
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already paid');
  END IF;

  -- Check if order already has an associated Razorpay Order ID
  IF v_order.razorpay_order_id IS NOT NULL AND TRIM(v_order.razorpay_order_id) <> '' THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_existing', true,
      'razorpay_order_id', v_order.razorpay_order_id,
      'order_id', v_order.id,
      'total_amount', v_order.total_amount
    );
  END IF;

  -- Associate the newly created Razorpay Order ID
  UPDATE public.orders
  SET razorpay_order_id = p_razorpay_order_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_existing', false,
    'razorpay_order_id', p_razorpay_order_id,
    'order_id', v_order.id,
    'total_amount', v_order.total_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_razorpay_order_id(UUID, TEXT) TO authenticated, service_role;

-- 4. SERVER-AUTHORITATIVE PAYMENT CONFIRMATION RPC
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

  -- Disallow confirming cancelled orders
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot confirm payment on a cancelled order');
  END IF;

  -- Verify amount match if provided
  IF p_paid_amount IS NOT NULL AND v_order.total_amount <> p_paid_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Payment amount mismatch. Expected: ' || v_order.total_amount || ', Received: ' || p_paid_amount
    );
  END IF;

  -- Authoritatively transition order to confirmed & paid
  UPDATE public.orders
  SET status = 'confirmed',
      payment_status = 'paid',
      payment_method = 'razorpay',
      payment_reference = p_razorpay_payment_id,
      razorpay_order_id = COALESCE(v_order.razorpay_order_id, p_razorpay_order_id),
      razorpay_payment_id = p_razorpay_payment_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  -- NOTE: Inventory was already decremented during reservation (create_order).
  -- It is NOT decremented again here.

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

-- 5. PAYMENT FAILURE RECORDING RPC (Stale protection & reservation retention)
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
BEGIN
  SELECT id, order_number, status, payment_status, notes
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- CRITICAL: Never downgrade a legitimately paid order due to a stale/delayed failure event!
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

  -- Record payment failure while KEEPING the reservation valid for retries
  UPDATE public.orders
  SET payment_status = 'failed',
      notes = CASE
        WHEN p_error_message IS NOT NULL AND p_error_message <> '' THEN
          COALESCE(v_order.notes || E'\n', '') || 'Payment attempt failed: ' || p_error_message
        ELSE v_order.notes
      END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  -- CRITICAL: Inventory is NOT restored on payment failure alone.
  -- The customer remains free to retry payment while the order remains pending.

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'status', v_order.status,
    'payment_status', 'failed',
    'reservation_retained', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment_failure(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- 6. EXPLICIT UNPAID ORDER CANCELLATION RPC (Atomic single inventory restoration)
CREATE OR REPLACE FUNCTION public.cancel_unpaid_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'customer_cancellation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_restored_count INT := 0;
BEGIN
  -- Row-lock order
  SELECT id, order_number, customer_id, status, payment_status, notes
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Authorization: Caller must be the order owner OR an admin
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_order.customer_id AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to cancel this order');
  END IF;

  -- Idempotency: If already cancelled, return success immediately without duplicate inventory restoration
  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_already_cancelled', true,
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'restored_items_count', 0
    );
  END IF;

  -- Disallow cancelling paid orders
  IF v_order.payment_status = 'paid' OR v_order.status NOT IN ('pending') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only pending unpaid orders can be cancelled. Current payment status: ' || v_order.payment_status
    );
  END IF;

  -- Transition status to cancelled
  UPDATE public.orders
  SET status = 'cancelled',
      payment_status = 'failed',
      notes = COALESCE(v_order.notes || E'\n', '') || 'Order cancelled (' || p_reason || ') at ' || timezone('utc'::text, now())::TEXT,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  -- Atomically restore reserved quantities to inventory
  FOR v_item IN
    SELECT variant_id, quantity
    FROM public.order_items
    WHERE order_id = p_order_id AND variant_id IS NOT NULL
  LOOP
    UPDATE public.inventory
    SET quantity = quantity + v_item.quantity,
        updated_at = timezone('utc'::text, now())
    WHERE variant_id = v_item.variant_id;

    v_restored_count := v_restored_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'is_already_cancelled', false,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'restored_items_count', v_restored_count,
    'status', 'cancelled',
    'payment_status', 'failed'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_unpaid_order(UUID, TEXT) TO authenticated, service_role;

-- 7. AUTOMATIC UNPAID ORDER EXPIRATION RPC (Concurrency-safe batch processing)
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders(
  p_batch_size INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_order RECORD;
  v_expired_count INT := 0;
  v_cancel_res JSONB;
BEGIN
  -- Concurrency protection: SKIP LOCKED prevents concurrent invocations from colliding
  FOR v_order IN
    SELECT id, order_number
    FROM public.orders
    WHERE status = 'pending'
      AND payment_status IN ('unpaid', 'failed')
      AND expires_at < timezone('utc'::text, now())
    ORDER BY expires_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  LOOP
    v_cancel_res := public.cancel_unpaid_order(v_order.id, 'reservation_expired');
    IF (v_cancel_res->>'success')::BOOLEAN = true THEN
      v_expired_count := v_expired_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expired_orders_count', v_expired_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders(INT) TO authenticated, service_role;

-- 8. VERIFIED REFUND RECORDING RPC (Foundation)
CREATE OR REPLACE FUNCTION public.record_order_refund(
  p_order_id UUID,
  p_razorpay_payment_id TEXT,
  p_refund_id TEXT,
  p_refund_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT id, order_number, status, payment_status, total_amount, notes
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Idempotency
  IF v_order.payment_status = 'refunded' THEN
    RETURN jsonb_build_object('success', true, 'is_already_refunded', true);
  END IF;

  UPDATE public.orders
  SET payment_status = 'refunded',
      status = CASE WHEN v_order.status IN ('confirmed', 'pending') THEN 'refunded' ELSE v_order.status END,
      notes = COALESCE(v_order.notes || E'\n', '') || 'Refund processed: ' || p_refund_id || ' (₹' || p_refund_amount || ')',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_order_id;

  -- Historical commission_rate, commission_amount, seller_payout_amount in order_items
  -- remain untouched snapshots. Inventory is NOT automatically altered by refund events.

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'payment_status', 'refunded'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_order_refund(UUID, TEXT, TEXT, NUMERIC) TO authenticated, service_role;
