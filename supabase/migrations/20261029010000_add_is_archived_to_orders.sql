-- 20261029010000_add_is_archived_to_orders.sql
-- Non-destructive forward migration to support soft-archiving of test and pre-launch orders.

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_is_archived 
ON public.orders (is_archived);

COMMENT ON COLUMN public.orders.is_archived IS 'Flag to soft-archive test, simulated, or pre-launch orders from operational admin views without deleting financial and audit history.';

