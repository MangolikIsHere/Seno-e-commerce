-- ==============================================================================
-- SENO SELLER DASHBOARD NOTIFICATIONS & EVENT SYNCHRONIZATION
-- Migration: 20261013100000_seller_dashboard_notifications.sql
-- ==============================================================================

-- 1. EXTEND NOTIFICATION TYPE ENUM
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_product_approved';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_product_rejected';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_product_suspended';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_commission_updated';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_account_approved';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_account_suspended';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_account_rejected';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_notice';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 2. ENSURE NOTIFICATIONS TABLE RLS ALLOWS PROPER REALTIME RECIPIENT ISOLATION
-- Sellers and customers can ONLY select their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

COMMENT ON TABLE public.notifications IS 'Authoritative audit log of customer, seller, and administrator notification events.';
