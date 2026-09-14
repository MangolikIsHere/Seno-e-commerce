-- ==============================================================================
-- SENO FASHION MARKETPLACE - STAGE 1 BACKEND SCHEMA MIGRATION (REVISED)
-- Migration: 20260914000000_initial_seno_marketplace_schema.sql
-- Description: Hardened core schema, 16 tables, RLS policies, triggers, and indexes.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. UTILITY FUNCTIONS (UPDATED_AT & SECURITY HELPERS)
-- ------------------------------------------------------------------------------

-- Generic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. CORE TABLES
-- ------------------------------------------------------------------------------

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'reseller', 'admin')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Security Helper: Is current authenticated user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. SELLERS (Unified for SENO platform & independent resellers)
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  store_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  seller_type TEXT NOT NULL DEFAULT 'reseller' CHECK (seller_type IN ('platform', 'reseller')),
  seller_status TEXT NOT NULL DEFAULT 'pending' CHECK (seller_status IN ('pending', 'approved', 'suspended', 'rejected')),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  contact_email TEXT,
  contact_phone TEXT,
  payout_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Stage 1 safeguard: SENO has exactly one platform seller.
CREATE UNIQUE INDEX IF NOT EXISTS sellers_single_platform_idx
  ON public.sellers (seller_type)
  WHERE seller_type = 'platform';

CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON public.sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_type ON public.sellers(seller_type);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_status ON public.sellers(seller_status);
CREATE INDEX IF NOT EXISTS idx_sellers_slug ON public.sellers(slug);

CREATE TRIGGER trg_sellers_updated_at
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Security Helper: Retrieve current authenticated user's seller_id
CREATE OR REPLACE FUNCTION public.get_current_seller_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  RETURN (
    SELECT id FROM public.sellers
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$;

-- Security Helper: Retrieve the SENO platform seller_id
CREATE OR REPLACE FUNCTION public.get_platform_seller_id()
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  RETURN (
    SELECT id FROM public.sellers
    WHERE seller_type = 'platform'
    LIMIT 1
  );
END;
$$;

-- Security Helper: Is specified seller approved? (Used by public RLS policies without exposing private seller data)
CREATE OR REPLACE FUNCTION public.is_approved_seller(p_seller_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sellers
    WHERE id = p_seller_id AND seller_status = 'approved'
  );
END;
$$;

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 4. COLLECTIONS
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  banner_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);
CREATE INDEX IF NOT EXISTS idx_collections_is_active ON public.collections(is_active);

CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  default_weight_grams NUMERIC(10,2) NOT NULL CHECK (default_weight_grams > 0),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  featured_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
  rejection_reason TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON public.products(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured, featured_order) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_new ON public.products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_bestseller ON public.products(is_bestseller) WHERE is_bestseller = true;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 6. COLLECTION_PRODUCTS (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.collection_products (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_products_product_id ON public.collection_products(product_id);

-- 7. PRODUCT_IMAGES
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON public.product_images(product_id, display_order);

-- Enforce at most one primary image per product at the database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_single_primary
  ON public.product_images (product_id)
  WHERE is_primary = true;

-- 8. PRODUCT_VARIANTS
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT,
  colour TEXT,
  sku TEXT NOT NULL UNIQUE,
  price_override NUMERIC(10,2) CHECK (price_override IS NULL OR price_override >= 0),
  weight_grams_override NUMERIC(10,2) CHECK (weight_grams_override IS NULL OR weight_grams_override > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_is_active ON public.product_variants(is_active);

-- Prevent duplicate size/colour combinations per product, handling nulls gracefully
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_size_colour
  ON public.product_variants (
    product_id,
    COALESCE(LOWER(TRIM(size)), ''),
    COALESCE(LOWER(TRIM(colour)), '')
  );

CREATE TRIGGER trg_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 9. INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL UNIQUE REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant_id ON public.inventory(variant_id);

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 3. CUSTOMER TABLES
-- ------------------------------------------------------------------------------

-- 10. ADDRESSES
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_is_default ON public.addresses(user_id, is_default) WHERE is_default = true;

CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 11. WISHLISTS
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);

CREATE TRIGGER trg_wishlists_updated_at
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 12. WISHLIST_ITEMS
CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wishlist_id UUID NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_wishlist_product UNIQUE (wishlist_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist_id ON public.wishlist_items(wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON public.wishlist_items(product_id);

-- ------------------------------------------------------------------------------
-- 4. ORDERS & MULTI-VENDOR ORDER ITEMS
-- ------------------------------------------------------------------------------

-- 13. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'authorized', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  payment_reference TEXT,
  subtotal_amount NUMERIC(10,2) NOT NULL CHECK (subtotal_amount >= 0),
  shipping_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (shipping_amount >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  total_weight_grams NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_weight_grams >= 0),
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 14. ORDER_ITEMS (Snapshots preserving historical data across multiple sellers)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  variant_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  unit_weight_grams NUMERIC(10,2) NOT NULL CHECK (unit_weight_grams > 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (commission_amount >= 0),
  seller_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (seller_payout_amount >= 0),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  carrier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON public.order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status ON public.order_items(fulfillment_status);

CREATE TRIGGER trg_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 5. SHIPPING CONFIGURATION TABLES
-- ------------------------------------------------------------------------------

-- 15. SHIPPING_SETTINGS
CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_mode TEXT NOT NULL DEFAULT 'base_incremental' CHECK (calculation_mode IN ('base_incremental', 'weight_slab')),
  free_shipping_threshold NUMERIC(10,2) CHECK (free_shipping_threshold IS NULL OR free_shipping_threshold >= 0),
  base_weight_grams NUMERIC(10,2) NOT NULL DEFAULT 500.00 CHECK (base_weight_grams > 0),
  base_rate NUMERIC(10,2) NOT NULL DEFAULT 70.00 CHECK (base_rate >= 0),
  incremental_weight_grams NUMERIC(10,2) NOT NULL DEFAULT 500.00 CHECK (incremental_weight_grams > 0),
  incremental_rate NUMERIC(10,2) NOT NULL DEFAULT 20.00 CHECK (incremental_rate >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shipping_settings_is_active ON public.shipping_settings(is_active);

-- Ensure strictly at most one active shipping configuration at any time
CREATE UNIQUE INDEX IF NOT EXISTS uq_shipping_settings_single_active
  ON public.shipping_settings (is_active)
  WHERE is_active = true;

CREATE TRIGGER trg_shipping_settings_updated_at
  BEFORE UPDATE ON public.shipping_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 16. SHIPPING_WEIGHT_RULES (Weight Slabs)
CREATE TABLE IF NOT EXISTS public.shipping_weight_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_weight_grams NUMERIC(10,2) NOT NULL CHECK (min_weight_grams >= 0),
  max_weight_grams NUMERIC(10,2) NOT NULL CHECK (max_weight_grams > min_weight_grams),
  rate NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shipping_weight_rules_active ON public.shipping_weight_rules(is_active, min_weight_grams);

CREATE TRIGGER trg_shipping_weight_rules_updated_at
  BEFORE UPDATE ON public.shipping_weight_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Slab validation: Prevent overlapping active weight ranges
CREATE OR REPLACE FUNCTION public.validate_shipping_weight_slab()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.is_active = true THEN
    IF EXISTS (
      SELECT 1 FROM public.shipping_weight_rules
      WHERE is_active = true
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (NEW.min_weight_grams < max_weight_grams AND NEW.max_weight_grams > min_weight_grams)
    ) THEN
      RAISE EXCEPTION 'Active shipping weight slabs cannot overlap. Range [% - %) conflicts with an existing active slab.',
        NEW.min_weight_grams, NEW.max_weight_grams;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_shipping_weight_slab
  BEFORE INSERT OR UPDATE ON public.shipping_weight_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_shipping_weight_slab();

-- ------------------------------------------------------------------------------
-- 6. BUSINESS LOGIC & INTEGRITY TRIGGERS
-- ------------------------------------------------------------------------------

-- A. Auto-create Profile on auth.users Signup
-- CRITICAL SECURITY: Never trust raw_user_meta_data for role assignment.
-- All new auth signups must default to 'customer'.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    'customer',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE
      WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' THEN EXCLUDED.full_name
      ELSE public.profiles.full_name
    END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- B. Product Ownership & Approval Lifecycle Trigger
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
      -- 1. Retrieve the SENO platform seller ID
      v_platform_seller_id := public.get_platform_seller_id();
      IF v_platform_seller_id IS NULL THEN
        RAISE EXCEPTION 'Platform seller record not found. Please initialize platform seller first.';
      END IF;

      -- 2. Admin product ownership rules:
      -- If seller_id is omitted, default to platform seller
      IF NEW.seller_id IS NULL THEN
        NEW.seller_id := v_platform_seller_id;
      ELSIF NEW.seller_id <> v_platform_seller_id THEN
        -- If seller_id is provided but is NOT the platform seller, reject the insert
        RAISE EXCEPTION 'Administrators can only create products belonging to the SENO platform seller in Stage 1.';
      END IF;

      -- 3. Platform products created by admins are automatically approved
      NEW.approval_status := 'approved';
      NEW.rejection_reason := NULL;
      IF NEW.published_at IS NULL THEN
        NEW.published_at := timezone('utc'::text, now());
      END IF;

    ELSE
      -- Reseller creating product:
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
          -- Maintain existing approval status
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

CREATE TRIGGER trg_enforce_product_rules
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_rules();

-- C. Seller Protection Trigger (Prevent resellers from modifying restricted fields)
CREATE OR REPLACE FUNCTION public.protect_seller_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF OLD.seller_status IS DISTINCT FROM NEW.seller_status THEN
      RAISE EXCEPTION 'Only administrators can update seller_status.';
    END IF;
    IF OLD.commission_rate IS DISTINCT FROM NEW.commission_rate THEN
      RAISE EXCEPTION 'Only administrators can update commission_rate.';
    END IF;
    IF OLD.seller_type IS DISTINCT FROM NEW.seller_type THEN
      RAISE EXCEPTION 'seller_type is immutable.';
    END IF;
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'user_id is immutable.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_seller_fields
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_seller_fields();

-- D. Order Item Snapshot Protection Trigger
CREATE OR REPLACE FUNCTION public.protect_order_item_snapshots()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN
    -- Reseller can only update fulfillment fields: fulfillment_status, tracking_number, carrier
    IF OLD.order_id IS DISTINCT FROM NEW.order_id OR
       OLD.seller_id IS DISTINCT FROM NEW.seller_id OR
       OLD.product_id IS DISTINCT FROM NEW.product_id OR
       OLD.variant_id IS DISTINCT FROM NEW.variant_id OR
       OLD.product_name IS DISTINCT FROM NEW.product_name OR
       OLD.sku IS DISTINCT FROM NEW.sku OR
       OLD.unit_price IS DISTINCT FROM NEW.unit_price OR
       OLD.unit_weight_grams IS DISTINCT FROM NEW.unit_weight_grams OR
       OLD.quantity IS DISTINCT FROM NEW.quantity OR
       OLD.total_price IS DISTINCT FROM NEW.total_price OR
       OLD.commission_rate IS DISTINCT FROM NEW.commission_rate OR
       OLD.commission_amount IS DISTINCT FROM NEW.commission_amount OR
       OLD.seller_payout_amount IS DISTINCT FROM NEW.seller_payout_amount THEN
      RAISE EXCEPTION 'Only fulfillment fields (status, tracking, carrier) can be updated by sellers.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_order_item_snapshots
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_order_item_snapshots();

-- ------------------------------------------------------------------------------
-- 7. SAFE PUBLIC SELLER VIEW (Hides private financials and contact details)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.sellers_public AS
SELECT
  id,
  store_name,
  slug,
  description,
  logo_url,
  banner_url,
  created_at
FROM public.sellers
WHERE seller_status = 'approved';

GRANT SELECT ON public.sellers_public TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all 16 user-facing tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_weight_rules ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_admin_all"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_self_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Prevent non-admin users from changing profile roles.
-- New users are created as customers; role elevation must be performed by an
-- existing administrator or trusted Supabase service-role process.
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow an existing administrator to manage roles, or a trusted
    -- Supabase service-role operation used for controlled bootstrap/admin work.
    -- Normal authenticated users can never change their own role.
    IF NOT public.is_admin()
       AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
      RAISE EXCEPTION 'Only an administrator or trusted service-role operation can change profile roles';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_role_trigger ON public.profiles;

CREATE TRIGGER protect_profile_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_role();

-- Role changes are blocked by protect_profile_role_trigger above.
-- This policy intentionally covers self-profile updates; the trigger prevents
-- privilege escalation through the protected `role` column.
CREATE POLICY "profiles_self_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- RLS: SELLERS (Table is restricted; public queries use public.sellers_public)
-- ------------------------------------------------------------------------------
CREATE POLICY "sellers_admin_all"
  ON public.sellers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "sellers_owner_select"
  ON public.sellers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "sellers_owner_insert"
  ON public.sellers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND seller_type = 'reseller'
    AND seller_status = 'pending'
    AND commission_rate = 0.00
  );

CREATE POLICY "sellers_owner_update"
  ON public.sellers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- RLS: CATEGORIES
-- ------------------------------------------------------------------------------
CREATE POLICY "categories_admin_all"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "categories_public_select_active"
  ON public.categories
  FOR SELECT
  TO public
  USING (is_active = true);

-- ------------------------------------------------------------------------------
-- RLS: COLLECTIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "collections_admin_all"
  ON public.collections
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "collections_public_select_active"
  ON public.collections
  FOR SELECT
  TO public
  USING (is_active = true);

-- ------------------------------------------------------------------------------
-- RLS: COLLECTION_PRODUCTS
-- ------------------------------------------------------------------------------
CREATE POLICY "collection_products_admin_all"
  ON public.collection_products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "collection_products_public_select"
  ON public.collection_products
  FOR SELECT
  TO public
  USING (true);

-- ------------------------------------------------------------------------------
-- RLS: PRODUCTS
-- ------------------------------------------------------------------------------
CREATE POLICY "products_admin_all"
  ON public.products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public: only active + approved products from approved sellers (checked via security definer function)
CREATE POLICY "products_public_select"
  ON public.products
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND approval_status = 'approved'
    AND public.is_approved_seller(seller_id)
  );

-- Resellers: manage exclusively their own products
CREATE POLICY "products_reseller_select"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (seller_id = public.get_current_seller_id());

CREATE POLICY "products_reseller_insert"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = public.get_current_seller_id());

CREATE POLICY "products_reseller_update"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (seller_id = public.get_current_seller_id())
  WITH CHECK (seller_id = public.get_current_seller_id());

CREATE POLICY "products_reseller_delete"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    seller_id = public.get_current_seller_id()
    AND approval_status IN ('draft', 'submitted', 'rejected')
  );

-- ------------------------------------------------------------------------------
-- RLS: PRODUCT_IMAGES
-- ------------------------------------------------------------------------------
CREATE POLICY "product_images_admin_all"
  ON public.product_images
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "product_images_public_select"
  ON public.product_images
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.is_active = true
        AND p.approval_status = 'approved'
        AND public.is_approved_seller(p.seller_id)
    )
  );

CREATE POLICY "product_images_reseller_manage"
  ON public.product_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.seller_id = public.get_current_seller_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_images.product_id
        AND p.seller_id = public.get_current_seller_id()
    )
  );

-- ------------------------------------------------------------------------------
-- RLS: PRODUCT_VARIANTS
-- ------------------------------------------------------------------------------
CREATE POLICY "product_variants_admin_all"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "product_variants_public_select"
  ON public.product_variants
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.is_active = true
        AND p.approval_status = 'approved'
        AND public.is_approved_seller(p.seller_id)
    )
  );

CREATE POLICY "product_variants_reseller_manage"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.seller_id = public.get_current_seller_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_variants.product_id
        AND p.seller_id = public.get_current_seller_id()
    )
  );

-- ------------------------------------------------------------------------------
-- RLS: INVENTORY
-- ------------------------------------------------------------------------------
CREATE POLICY "inventory_admin_all"
  ON public.inventory
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "inventory_reseller_manage"
  ON public.inventory
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = inventory.variant_id
        AND p.seller_id = public.get_current_seller_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_variants pv
      JOIN public.products p ON p.id = pv.product_id
      WHERE pv.id = inventory.variant_id
        AND p.seller_id = public.get_current_seller_id()
    )
  );

-- ------------------------------------------------------------------------------
-- RLS: ADDRESSES
-- ------------------------------------------------------------------------------
CREATE POLICY "addresses_admin_all"
  ON public.addresses
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "addresses_owner_manage"
  ON public.addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- RLS: WISHLISTS
-- ------------------------------------------------------------------------------
CREATE POLICY "wishlists_admin_all"
  ON public.wishlists
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "wishlists_owner_manage"
  ON public.wishlists
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- RLS: WISHLIST_ITEMS
-- ------------------------------------------------------------------------------
CREATE POLICY "wishlist_items_admin_all"
  ON public.wishlist_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "wishlist_items_owner_manage"
  ON public.wishlist_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.wishlists w
      WHERE w.id = wishlist_items.wishlist_id
        AND w.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------------------------
-- RLS: ORDERS (Protected against unverified direct client inserts)
-- ------------------------------------------------------------------------------
CREATE POLICY "orders_admin_all"
  ON public.orders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Customer: can only read their own placed orders
CREATE POLICY "orders_customer_select"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- NOTE: Direct client INSERT on orders is intentionally omitted.
-- Orders must be created through trusted server-side checkout execution (Service Role).

-- ------------------------------------------------------------------------------
-- RLS: ORDER_ITEMS
-- ------------------------------------------------------------------------------
CREATE POLICY "order_items_admin_all"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Customer: read items belonging to their own orders
CREATE POLICY "order_items_customer_select"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- Reseller: read items strictly where they are the seller
CREATE POLICY "order_items_reseller_select"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (seller_id = public.get_current_seller_id());

-- Reseller: update fulfillment status and tracking strictly for their items
CREATE POLICY "order_items_reseller_update"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (seller_id = public.get_current_seller_id())
  WITH CHECK (seller_id = public.get_current_seller_id());

-- ------------------------------------------------------------------------------
-- RLS: SHIPPING_SETTINGS
-- ------------------------------------------------------------------------------
CREATE POLICY "shipping_settings_admin_all"
  ON public.shipping_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "shipping_settings_public_select"
  ON public.shipping_settings
  FOR SELECT
  TO public
  USING (is_active = true);

-- ------------------------------------------------------------------------------
-- RLS: SHIPPING_WEIGHT_RULES
-- ------------------------------------------------------------------------------
CREATE POLICY "shipping_weight_rules_admin_all"
  ON public.shipping_weight_rules
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "shipping_weight_rules_public_select"
  ON public.shipping_weight_rules
  FOR SELECT
  TO public
  USING (is_active = true);
