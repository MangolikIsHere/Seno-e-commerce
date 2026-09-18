-- SENO fulfillment lifecycle support
-- Adds the missing seller-managed fulfillment states and ETA fields while preserving historical snapshot data.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_fulfillment_status_check;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_fulfillment_status_check
  CHECK (
    fulfillment_status IN (
      'unfulfilled',
      'processing',
      'dispatched',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'cancelled',
      'returned',
      'delivery_failed'
    )
  );

CREATE TABLE IF NOT EXISTS public.fulfillment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'seller' CHECK (actor_type IN ('seller', 'admin', 'system', 'customer')),
  actor_id UUID,
  note TEXT,
  carrier TEXT,
  tracking_number TEXT,
  estimated_delivery_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_events_order_item_id
  ON public.fulfillment_events(order_item_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_fulfillment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
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
    'seller',
    public.get_current_seller_id(),
    NULL,
    NEW.carrier,
    NEW.tracking_number,
    NEW.estimated_delivery_date
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_fulfillment_event ON public.order_items;
CREATE TRIGGER trg_record_fulfillment_event
  AFTER INSERT OR UPDATE OF fulfillment_status, carrier, tracking_number, estimated_delivery_date
  ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.record_fulfillment_event();

CREATE OR REPLACE FUNCTION public.validate_order_item_fulfillment_transition(
  old_status TEXT,
  new_status TEXT,
  new_tracking TEXT,
  new_carrier TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF old_status = new_status THEN
    RETURN TRUE;
  END IF;

  IF old_status = 'unfulfilled' AND new_status IN ('processing', 'cancelled', 'delivery_failed') THEN
    RETURN TRUE;
  END IF;

  IF old_status = 'processing' AND new_status IN ('dispatched', 'cancelled', 'delivery_failed') THEN
    RETURN TRUE;
  END IF;

  IF old_status = 'dispatched' AND new_status IN ('in_transit', 'cancelled', 'delivery_failed') THEN
    RETURN TRUE;
  END IF;

  IF old_status = 'in_transit' AND new_status IN ('out_for_delivery', 'cancelled', 'delivery_failed') THEN
    RETURN TRUE;
  END IF;

  IF old_status = 'out_for_delivery' AND new_status IN ('delivered', 'cancelled', 'delivery_failed') THEN
    RETURN TRUE;
  END IF;

  IF old_status = 'delivered' AND new_status IN ('returned') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
