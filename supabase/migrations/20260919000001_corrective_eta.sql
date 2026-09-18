-- Migration: 20260919000001_corrective_eta.sql
-- Description: Ensures estimated_delivery_date exists and forces schema reload

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMPTZ;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMPTZ;

-- Force PostgREST to reload the schema cache so the API recognizes the new columns immediately
NOTIFY pgrst, 'reload schema';
