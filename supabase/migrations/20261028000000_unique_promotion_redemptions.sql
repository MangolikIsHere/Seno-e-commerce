-- ==============================================================================
-- SENO MARKETPLACE — IDEMPOTENT PROMOTION REDEMPTIONS
-- Migration: 20261028000000_unique_promotion_redemptions.sql
-- ==============================================================================
-- Prevents race conditions and duplicate redemption rows when payment verification,
-- pending-order reconciliation, and Razorpay webhooks execute concurrently.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_promotion_redemptions_order_promo_unique 
  ON public.promotion_redemptions(order_id, promotion_id);

