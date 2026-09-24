-- ==============================================================================
-- SENO NOTIFICATIONS SYSTEM & REALTIME ARCHITECTURE
-- Migration: 20260925000000_notifications_system.sql
-- ==============================================================================

-- 1. NOTIFICATION TYPE ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM (
      'order_placed',
      'payment_confirmed',
      'payment_failed',
      'order_processing',
      'order_dispatched',
      'order_in_transit',
      'order_out_for_delivery',
      'order_delivered',
      'order_cancelled',
      'refund_initiated',
      'refund_completed',
      'seller_new_order',
      'seller_item_cancelled',
      'admin_new_order',
      'admin_payment_failed',
      'admin_refund_requested'
    );
  END IF;
END $$;

-- 2. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Idempotency Index: ensures a specific business event cannot produce duplicate notifications
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency_key
  ON public.notifications (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- High-performance query indexes for user feed & unread counts
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_all
  ON public.notifications (user_id, created_at DESC);

-- 3. WEB PUSH SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions (user_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

-- Insert policy: normal users CANNOT insert arbitrary system notifications.
-- Only backend service_role, migration admins, or SECURITY DEFINER RPCs can insert.
DROP POLICY IF EXISTS "notifications_insert_admin_or_service" ON public.notifications;
CREATE POLICY "notifications_insert_admin_or_service"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
  );

-- Push Subscriptions Policies
DROP POLICY IF EXISTS "push_subs_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_select_own"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subs_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_insert_own"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subs_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_update_own"
  ON public.push_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subs_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subs_delete_own"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 5. RPC: Create Notification Idempotently (Security Definer)
CREATE OR REPLACE FUNCTION public.create_system_notification(
  p_user_id UUID,
  p_type public.notification_type,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_notification RECORD;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    -- Check if already exists
    SELECT id, created_at INTO v_notification
    FROM public.notifications
    WHERE idempotency_key = p_idempotency_key;

    IF v_notification.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'id', v_notification.id,
        'created_at', v_notification.created_at
      );
    END IF;
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data,
    idempotency_key
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    COALESCE(p_data, '{}'::jsonb),
    p_idempotency_key
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id, created_at INTO v_notification;

  IF v_notification.id IS NULL THEN
    -- In case of concurrent conflict
    SELECT id, created_at INTO v_notification
    FROM public.notifications
    WHERE idempotency_key = p_idempotency_key;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'id', v_notification.id,
    'created_at', v_notification.created_at
  );
END;
$$;

-- 6. RPC: Mark Notifications As Read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  p_notification_ids UUID[] DEFAULT NULL,
  p_mark_all BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_count INT := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  IF p_mark_all THEN
    UPDATE public.notifications
    SET read_at = timezone('utc'::text, now())
    WHERE user_id = v_uid AND read_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSIF p_notification_ids IS NOT NULL AND array_length(p_notification_ids, 1) > 0 THEN
    UPDATE public.notifications
    SET read_at = timezone('utc'::text, now())
    WHERE user_id = v_uid AND id = ANY(p_notification_ids) AND read_at IS NULL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('success', true, 'updated_count', v_count);
END;
$$;

-- 7. ENABLE REALTIME PUBLICATION FOR NOTIFICATIONS TABLE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    -- Check if table is already in publication
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;
