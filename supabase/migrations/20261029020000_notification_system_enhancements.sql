-- ==============================================================================
-- SENO NOTIFICATION SYSTEM ENHANCEMENTS & INDEX OPTIMIZATION
-- Migration: 20261029020000_notification_system_enhancements.sql
-- ==============================================================================

-- 1. EXTEND NOTIFICATION TYPE ENUM SAFELY (Forward-only, non-destructive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seller_low_stock';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_low_stock';
    EXCEPTION WHEN duplicate_object THEN NULL; END;

    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'order_returned';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 2. ENSURE COMPOSITE PERFORMANCE INDEX FOR USER NOTIFICATION FEEDS & UNREAD COUNTS
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON public.notifications (user_id, type, created_at DESC);

-- 3. ENSURE IDEMPOTENCY KEY UNIQUE INDEX EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency_key
  ON public.notifications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

