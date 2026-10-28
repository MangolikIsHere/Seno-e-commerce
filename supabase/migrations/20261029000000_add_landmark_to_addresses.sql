-- ==============================================================================
-- SENO MARKETPLACE — MANDATORY LANDMARK IN DELIVERY ADDRESSES
-- Migration: 20261029000000_add_landmark_to_addresses.sql
-- ==============================================================================
-- 1. Adds landmark column to public.addresses table.
-- 2. Kept nullable at database level so existing legacy customer addresses
--    and historical orders remain non-destructive and backward compatible.
-- 3. Application layers (checkout, customer address book, and order placement RPCs)
--    enforce landmark as mandatory for all new address creations, edits, and checkouts.
-- ==============================================================================

ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS landmark TEXT;

COMMENT ON COLUMN public.addresses.landmark IS 'Mandatory nearby landmark for delivery address navigation (e.g. Near SBI Bank, Opposite City Hospital).';

