-- ==============================================================================
-- SENO LUXURY MARKETPLACE — MIGRATION: COLOUR-SPECIFIC PRODUCT IMAGES
-- Migration: 20261014000000_colour_specific_product_images.sql
-- ==============================================================================
-- Description:
-- Adds optional colour assignment and colour-primary designation to product_images.
-- Allows administrators and sellers to organize image assets by colour variant,
-- while preserving full backward compatibility for legacy products and existing
-- single-primary constraints.
-- ==============================================================================

-- 1. Add colour and is_colour_primary columns to public.product_images
ALTER TABLE public.product_images
  ADD COLUMN IF NOT EXISTS colour TEXT,
  ADD COLUMN IF NOT EXISTS is_colour_primary BOOLEAN NOT NULL DEFAULT false;

-- 2. Create index on (product_id, colour) for high-performance gallery lookups by colour
CREATE INDEX IF NOT EXISTS idx_product_images_product_colour
  ON public.product_images (product_id, colour);

-- 3. Create partial index ensuring fast retrieval of primary image per colour
CREATE INDEX IF NOT EXISTS idx_product_images_colour_primary
  ON public.product_images (product_id, LOWER(TRIM(colour)))
  WHERE is_colour_primary = true;

-- 4. Document columns for future maintainers
COMMENT ON COLUMN public.product_images.colour IS
  'Optional colour variant name (e.g. Black, Washed Navy) assigning this image asset to a specific colour group. NULL indicates a general or legacy product asset.';

COMMENT ON COLUMN public.product_images.is_colour_primary IS
  'True if this image is the designated primary/cover photo for its assigned colour group.';
