-- ==============================================================================
-- SENO MARKETPLACE — PREVENT DUPLICATE FULFILLMENT EVENTS ON NON-STATUS UPDATES
-- Migration: 20261002000002_prevent_duplicate_fulfillment_events.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_fulfillment_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_actor_type TEXT := 'seller';
  v_actor_id UUID;
BEGIN
  -- Only record a fulfillment event on new insert or when fulfillment_status actually transitions
  IF TG_OP = 'UPDATE' AND OLD.fulfillment_status IS NOT DISTINCT FROM NEW.fulfillment_status THEN
    RETURN NEW;
  END IF;

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
