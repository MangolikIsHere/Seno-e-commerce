-- ==============================================================================
-- SENO MARKETPLACE — FIX SELLER PRODUCT CREATION & RESELLER RLS POLICIES
-- Migration: 20261109150000_fix_seller_product_creation_and_rls.sql
-- ==============================================================================

-- 1. Update public.enforce_product_rules()
-- Fixes:
-- A) Allows service role and admin operations to insert reseller products without
--    triggering "Administrators can only create products belonging to the SENO platform seller" exception.
-- B) Enforces that reseller products always enter 'draft' or 'submitted' status (never auto-approved).
-- C) Preserves strict seller ownership validation and status checks.

CREATE OR REPLACE FUNCTION public.enforce_product_rules()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_seller_id UUID;
  v_seller_type TEXT;
  v_seller_status TEXT;
  v_platform_seller_id UUID;
  v_material_change BOOLEAN;
BEGIN
  v_is_admin := public.is_admin();

  -- ON INSERT:
  IF TG_OP = 'INSERT' THEN
    IF v_is_admin THEN
      v_platform_seller_id := public.get_platform_seller_id();
      IF v_platform_seller_id IS NULL THEN
        RAISE EXCEPTION 'Platform seller record not found. Please initialize platform seller first.';
      END IF;

      -- If seller_id is omitted or matches platform seller -> platform product
      IF NEW.seller_id IS NULL OR NEW.seller_id = v_platform_seller_id THEN
        NEW.seller_id := v_platform_seller_id;
        NEW.approval_status := 'approved';
        NEW.rejection_reason := NULL;
        IF NEW.published_at IS NULL THEN
          NEW.published_at := timezone('utc'::text, now());
        END IF;
      ELSE
        -- Admin or service-role performing product creation for an approved reseller
        SELECT id, seller_status, seller_type INTO v_seller_id, v_seller_status, v_seller_type
        FROM public.sellers
        WHERE id = NEW.seller_id
        LIMIT 1;

        IF v_seller_id IS NULL THEN
          RAISE EXCEPTION 'Specified seller record does not exist.';
        END IF;

        IF v_seller_status <> 'approved' THEN
          RAISE EXCEPTION 'Seller account is not approved to create products.';
        END IF;

        -- Reseller products must NOT be automatically approved
        IF NEW.approval_status NOT IN ('draft', 'submitted') THEN
          NEW.approval_status := 'submitted';
        END IF;
        NEW.rejection_reason := NULL;
        NEW.published_at := NULL;
      END IF;

    ELSE
      -- Reseller creating product directly via authenticated client:
      -- Strictly derive seller_id from authenticated seller record
      SELECT id, seller_status, seller_type INTO v_seller_id, v_seller_status, v_seller_type
      FROM public.sellers
      WHERE user_id = auth.uid()
      LIMIT 1;

      IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'No seller record associated with current account.';
      END IF;

      IF v_seller_status <> 'approved' THEN
        RAISE EXCEPTION 'Seller account is not approved to create products.';
      END IF;

      -- Assign seller_id automatically regardless of client input
      NEW.seller_id := v_seller_id;

      -- Resellers can only create products as draft or submitted
      IF NEW.approval_status NOT IN ('draft', 'submitted') THEN
        NEW.approval_status := 'draft';
      END IF;
      NEW.rejection_reason := NULL;
      NEW.published_at := NULL;
    END IF;

    RETURN NEW;
  END IF;

  -- ON UPDATE:
  IF TG_OP = 'UPDATE' THEN
    -- Invariant 1: seller_id is immutable
    IF OLD.seller_id IS DISTINCT FROM NEW.seller_id THEN
      RAISE EXCEPTION 'seller_id is immutable and cannot be altered.';
    END IF;

    -- Non-admin (Reseller) update lifecycle:
    IF NOT v_is_admin THEN
      -- Invariant 2: Resellers can never self-approve
      IF NEW.approval_status = 'approved' AND OLD.approval_status <> 'approved' THEN
        RAISE EXCEPTION 'Resellers cannot self-approve products. Please submit for admin review.';
      END IF;

      -- Invariant 3: Material edits to an already-approved product require re-review
      v_material_change := (
        OLD.name IS DISTINCT FROM NEW.name OR
        OLD.category_id IS DISTINCT FROM NEW.category_id OR
        OLD.description IS DISTINCT FROM NEW.description OR
        OLD.details IS DISTINCT FROM NEW.details OR
        OLD.price IS DISTINCT FROM NEW.price OR
        OLD.compare_at_price IS DISTINCT FROM NEW.compare_at_price OR
        OLD.default_weight_grams IS DISTINCT FROM NEW.default_weight_grams
      );

      IF OLD.approval_status = 'approved' THEN
        IF v_material_change THEN
          -- Revert approved status to submitted (or draft if requested)
          IF NEW.approval_status NOT IN ('draft', 'submitted') THEN
            NEW.approval_status := 'submitted';
          END IF;
          NEW.published_at := NULL;
          NEW.rejection_reason := NULL;
        ELSE
          -- Non-material edit (e.g. toggling active status or reordering images)
          NEW.approval_status := OLD.approval_status;
        END IF;
      ELSE
        -- Product was draft, submitted, or rejected
        IF NEW.approval_status NOT IN ('draft', 'submitted', OLD.approval_status) THEN
          RAISE EXCEPTION 'Invalid approval status transition for reseller. Allowed: draft, submitted.';
        END IF;

        -- Resubmitting a rejected product clears prior rejection reason
        IF OLD.approval_status = 'rejected' AND NEW.approval_status = 'submitted' THEN
          NEW.rejection_reason := NULL;
        END IF;
      END IF;

    ELSE
      -- Admin update lifecycle:
      IF NEW.approval_status = 'approved' AND OLD.approval_status <> 'approved' THEN
        NEW.published_at := timezone('utc'::text, now());
        NEW.rejection_reason := NULL;
      ELSIF NEW.approval_status = 'rejected' THEN
        NEW.published_at := NULL;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Reseller RLS Policy on collection_products
-- Allows resellers to manage collection memberships for products they own
DROP POLICY IF EXISTS "collection_products_reseller_manage" ON public.collection_products;

CREATE POLICY "collection_products_reseller_manage"
  ON public.collection_products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = collection_products.product_id
        AND p.seller_id = public.get_current_seller_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = collection_products.product_id
        AND p.seller_id = public.get_current_seller_id()
    )
  );

-- 3. Ensure bestseller index exists
CREATE INDEX IF NOT EXISTS idx_products_bestseller
  ON public.products(is_bestseller)
  WHERE is_bestseller = true;

