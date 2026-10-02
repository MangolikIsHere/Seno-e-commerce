-- ==============================================================================
-- SENO MARKETPLACE — REALTIME ORDER TRACKING & STATUS SYNCHRONIZATION
-- Migration: 20261002000001_enable_order_tracking_realtime.sql
-- ==============================================================================

-- 1. Enable Supabase Realtime for orders, order_items, and fulfillment_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'order_items'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'fulfillment_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.fulfillment_events;
    END IF;
  END IF;
END $$;

-- 2. Update record_fulfillment_event() to correctly record admin actor_type and id
CREATE OR REPLACE FUNCTION public.record_fulfillment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_actor_type TEXT := 'seller';
  v_actor_id UUID;
BEGIN
  IF public.is_admin() THEN
    v_actor_type := 'admin';
    v_actor_id := auth.uid();
  ELSE
    v_actor_type := 'seller';
    v_actor_id := public.get_current_seller_id();
  END IF;

  INSERT INTO public.fulfillment_events (
    order_item_id,
    status,
    actor_type,
    actor_id,
    note,
    carrier,
    tracking_number,
    estimated_delivery_date
  )
  VALUES (
    NEW.id,
    NEW.fulfillment_status,
    v_actor_type,
    v_actor_id,
    NULL,
    NEW.carrier,
    NEW.tracking_number,
    NEW.estimated_delivery_date
  );

  RETURN NEW;
END;
$$;

-- 3. Automatic synchronization: update orders.status whenever order_items.fulfillment_status changes
CREATE OR REPLACE FUNCTION public.sync_order_status_from_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_order_id UUID := NEW.order_id;
  v_total_items INT;
  v_delivered_items INT;
  v_shipped_items INT;
  v_processing_items INT;
  v_cancelled_items INT;
  v_new_status TEXT;
  v_current_status TEXT;
  v_payment_status TEXT;
BEGIN
  SELECT status, payment_status INTO v_current_status, v_payment_status
  FROM public.orders
  WHERE id = v_order_id;

  -- Do not overwrite cancelled, refunded or unpaid orders
  IF v_current_status IN ('cancelled', 'refunded') OR v_payment_status <> 'paid' THEN
    RETURN NEW;
  END IF;

  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE fulfillment_status = 'delivered'),
    COUNT(*) FILTER (WHERE fulfillment_status IN ('dispatched', 'in_transit', 'out_for_delivery', 'delivered')),
    COUNT(*) FILTER (WHERE fulfillment_status = 'processing'),
    COUNT(*) FILTER (WHERE fulfillment_status = 'cancelled')
  INTO v_total_items, v_delivered_items, v_shipped_items, v_processing_items, v_cancelled_items
  FROM public.order_items
  WHERE order_id = v_order_id;

  IF v_total_items > 0 THEN
    IF v_delivered_items = v_total_items THEN
      v_new_status := 'delivered';
    ELSIF v_cancelled_items = v_total_items THEN
      v_new_status := 'cancelled';
    ELSIF v_shipped_items = v_total_items THEN
      v_new_status := 'shipped';
    ELSIF v_shipped_items > 0 THEN
      v_new_status := 'partially_shipped';
    ELSIF v_processing_items > 0 THEN
      v_new_status := 'processing';
    ELSE
      v_new_status := 'confirmed';
    END IF;

    IF v_current_status IS DISTINCT FROM v_new_status THEN
      UPDATE public.orders
      SET status = v_new_status, updated_at = timezone('utc'::text, now())
      WHERE id = v_order_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_status_from_items ON public.order_items;
CREATE TRIGGER trg_sync_order_status_from_items
  AFTER INSERT OR UPDATE OF fulfillment_status ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status_from_items();

-- 4. Sync production test order SENO-20260930-357479 to 'processing' as configured by admin
UPDATE public.order_items
SET fulfillment_status = 'processing'
WHERE id = 'b8838771-f874-4872-bf9c-bc3eb9d190de';
