-- ==============================================================================
-- SENO MARKETPLACE — ADMIN APPROVAL WORKFLOW & NOTIFICATIONS
-- Migration: 20261110210000_admin_approval_and_notifications.sql
-- ==============================================================================

-- 1. Extend notification_type enum with 'admin_product_submitted'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    BEGIN
      ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'admin_product_submitted';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- 2. Update public.enforce_product_rules() trigger to enforce consistent publication status
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

  -- =========================================================================
  -- ON INSERT:
  -- =========================================================================
  IF TG_OP = 'INSERT' THEN
    IF v_is_admin THEN
      v_platform_seller_id := public.get_platform_seller_id();
      IF v_platform_seller_id IS NULL THEN
        RAISE EXCEPTION 'Platform seller record not found. Please initialize platform seller first.';
      END IF;

      -- If seller_id is omitted or matches platform seller -> platform product (auto-approved & active)
      IF NEW.seller_id IS NULL OR NEW.seller_id = v_platform_seller_id THEN
        NEW.seller_id := v_platform_seller_id;
        NEW.approval_status := 'approved';
        NEW.rejection_reason := NULL;
        IF NEW.published_at IS NULL THEN
          NEW.published_at := timezone('utc'::text, now());
        END IF;
        -- Platform products default to active unless explicitly deactivated
        IF NEW.is_active IS NULL THEN
          NEW.is_active := true;
        END IF;
      ELSE
        -- Admin or service-role creating product on behalf of an approved reseller
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
        -- Unapproved reseller product MUST be inactive on insertion
        NEW.is_active := false;
      END IF;

    ELSE
      -- Reseller creating product directly via authenticated client:
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

      -- Strictly assign seller_id automatically
      NEW.seller_id := v_seller_id;

      -- Resellers can only create products as draft or submitted
      IF NEW.approval_status NOT IN ('draft', 'submitted') THEN
        NEW.approval_status := 'draft';
      END IF;
      NEW.rejection_reason := NULL;
      NEW.published_at := NULL;
      -- Unapproved reseller product MUST be inactive on insertion
      NEW.is_active := false;
    END IF;

    RETURN NEW;
  END IF;

  -- =========================================================================
  -- ON UPDATE:
  -- =========================================================================
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
          -- Revert approved status to submitted
          IF NEW.approval_status NOT IN ('draft', 'submitted') THEN
            NEW.approval_status := 'submitted';
          END IF;
          NEW.published_at := NULL;
          NEW.rejection_reason := NULL;
          NEW.is_active := false; -- Deactivate until re-reviewed
        ELSE
          -- Non-material edit (e.g. reordering photos)
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

        -- Unapproved products cannot be active
        NEW.is_active := false;
      END IF;

    ELSE
      -- Admin update lifecycle:
      IF NEW.approval_status = 'approved' AND OLD.approval_status <> 'approved' THEN
        NEW.published_at := timezone('utc'::text, now());
        NEW.rejection_reason := NULL;
        -- When admin approves, make active on storefront by default
        NEW.is_active := true;
      ELSIF NEW.approval_status = 'rejected' THEN
        NEW.published_at := NULL;
        -- Rejected products can never be active
        NEW.is_active := false;
      ELSIF NEW.approval_status <> 'approved' THEN
        -- Pending review / draft products can never be active
        NEW.is_active := false;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Data cleanup: enforce is_active = false on all currently unapproved products
UPDATE public.products
SET is_active = false
WHERE approval_status <> 'approved' AND is_active = true;
