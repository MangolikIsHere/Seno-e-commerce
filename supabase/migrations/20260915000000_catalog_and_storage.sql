-- ==============================================================================
-- SENO MARKETPLACE — STAGE 7: CATALOG MANAGEMENT & SUPABASE STORAGE
-- Migration: 20260915000000_catalog_and_storage.sql
-- ==============================================================================
-- Description:
-- 1. Creates/configures the 'product-images' Supabase Storage bucket for product media.
-- 2. Configures Storage RLS policies: public read, authorized admin insert/update/delete.
-- 3. Adds 'inventory_public_select' policy on public.inventory so anonymous and public
--    storefront queries can read stock counts for active approved products without RLS nullification.
-- 4. Provides helper functions for catalog synchronization and inventory maintenance.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SUPABASE STORAGE BUCKET: product-images
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- Storage RLS: Public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_images_storage_public_select'
  ) THEN
    CREATE POLICY "product_images_storage_public_select"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- Storage RLS: Admin upload access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_images_storage_admin_insert'
  ) THEN
    CREATE POLICY "product_images_storage_admin_insert"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'product-images' AND public.is_admin());
  END IF;
END $$;

-- Storage RLS: Admin update access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_images_storage_admin_update'
  ) THEN
    CREATE POLICY "product_images_storage_admin_update"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'product-images' AND public.is_admin());
  END IF;
END $$;

-- Storage RLS: Admin delete access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'product_images_storage_admin_delete'
  ) THEN
    CREATE POLICY "product_images_storage_admin_delete"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'product-images' AND public.is_admin());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. INVENTORY PUBLIC SELECT POLICY
-- ------------------------------------------------------------------------------
-- Enables the public storefront to accurately read variant stock levels
-- for active, approved products without returning null or requiring elevated credentials.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'inventory' AND policyname = 'inventory_public_select'
  ) THEN
    CREATE POLICY "inventory_public_select"
      ON public.inventory
      FOR SELECT
      TO public
      USING (
        EXISTS (
          SELECT 1 FROM public.product_variants pv
          JOIN public.products p ON p.id = pv.product_id
          WHERE pv.id = inventory.variant_id
            AND pv.is_active = true
            AND p.is_active = true
            AND p.approval_status = 'approved'
            AND public.is_approved_seller(p.seller_id)
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. PLATFORM ADMIN PRODUCT MUTATION HELPER (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Helper for safe transactional product creation ensuring platform seller association.

CREATE OR REPLACE FUNCTION public.admin_set_variant_inventory(
  p_variant_id UUID,
  p_quantity INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only SENO administrators can adjust inventory.';
  END IF;

  IF p_quantity < 0 THEN
    RAISE EXCEPTION 'Inventory quantity cannot be negative.';
  END IF;

  INSERT INTO public.inventory (variant_id, quantity, low_stock_threshold)
  VALUES (p_variant_id, p_quantity, 5)
  ON CONFLICT (variant_id)
  DO UPDATE SET
    quantity = p_quantity,
    updated_at = timezone('utc'::text, now());
END;
$$;
