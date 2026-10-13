-- Migration: 20261013210000_accessories_and_category_management.sql
-- Description: Adds SEO fields to categories, activates Accessories category with gold-plated jewellery banner, and sets display order.

-- 1. Add SEO metadata fields to categories if not present
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- 2. Activate and update the Accessories category
DO $$
DECLARE
  v_accessories_id UUID;
BEGIN
  -- Check if accessories category exists by slug or id
  SELECT id INTO v_accessories_id
  FROM public.categories
  WHERE slug = 'accessories' OR id = 'f3726210-3350-4937-9089-6d418e452f8a'
  LIMIT 1;

  IF v_accessories_id IS NOT NULL THEN
    UPDATE public.categories
    SET name = 'Accessories',
        slug = 'accessories',
        description = 'Discover elegant gold-plated jewellery and everyday accessories that complete your look.',
        image_url = 'https://syvcrznkpisganlzkndq.supabase.co/storage/v1/object/public/product-images/categories/accessories-banner.jpg',
        display_order = 6,
        is_active = true,
        meta_title = 'Accessories & Jewellery — SENO',
        meta_description = 'Discover elegant gold-plated jewellery and everyday accessories that complete your look.',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_accessories_id;
  ELSE
    INSERT INTO public.categories (name, slug, description, image_url, display_order, is_active, meta_title, meta_description)
    VALUES (
      'Accessories',
      'accessories',
      'Discover elegant gold-plated jewellery and everyday accessories that complete your look.',
      'https://syvcrznkpisganlzkndq.supabase.co/storage/v1/object/public/product-images/categories/accessories-banner.jpg',
      6,
      true,
      'Accessories & Jewellery — SENO',
      'Discover elegant gold-plated jewellery and everyday accessories that complete your look.'
    );
  END IF;
END $$;

-- 3. Ensure canonical ordering for all active categories
UPDATE public.categories SET display_order = 1 WHERE slug = 'ethnic-traditional-wear';
UPDATE public.categories SET display_order = 2 WHERE slug = 'western';
UPDATE public.categories SET display_order = 3 WHERE slug = 'topwear';
UPDATE public.categories SET display_order = 4 WHERE slug = 'bottomwear';
UPDATE public.categories SET display_order = 5 WHERE slug = 'cosmetics';
UPDATE public.categories SET display_order = 6 WHERE slug = 'accessories';
