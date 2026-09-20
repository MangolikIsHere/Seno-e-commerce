-- Enable the pg_cron extension if it does not exist
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Attempt to unschedule the job in case this migration is re-run
-- Using an anonymous block to swallow the error if the job doesn't exist
DO $$
BEGIN
  PERFORM cron.unschedule('expire_unpaid_orders_cron');
EXCEPTION WHEN OTHERS THEN
  -- Ignore if job does not exist
END $$;

-- Schedule the cleanup every 5 minutes internally
SELECT cron.schedule('expire_unpaid_orders_cron', '*/5 * * * *', 'SELECT public.expire_unpaid_orders(100);');
