-- Replace the primary storefront taxonomy without touching orders, inventory, sellers, or historical snapshots.
-- Products that cannot be confidently mapped remain attached to an inactive legacy category for review.

INSERT INTO public.categories (name, slug, description, display_order, is_active)
VALUES
  ('Ethnic & Traditional Wear', 'ethnic-traditional-wear', 'Heritage silhouettes and modern craft.', 1, true),
  ('Western', 'western', 'Contemporary everyday forms.', 2, true),
  ('Topwear', 'topwear', 'Shirts, tees, and elevated essentials.', 3, true),
  ('Bottomwear', 'bottomwear', 'Denim, trousers, and modern separates.', 4, true),
  ('Cosmetics', 'cosmetics', 'Beauty, care, and finishing touches.', 5, true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = true;

DO $$
DECLARE
  v_ethnic UUID;
  v_western UUID;
  v_outerwear UUID;
  v_accessories UUID;
BEGIN
  SELECT id INTO v_ethnic FROM public.categories WHERE slug = 'ethnic-traditional-wear';
  SELECT id INTO v_western FROM public.categories WHERE slug = 'western';
  SELECT id INTO v_outerwear FROM public.categories WHERE slug = 'outerwear';
  SELECT id INTO v_accessories FROM public.categories WHERE slug = 'accessories';

  -- These uploaded products are explicitly ethnic/traditional by their names and data.
  UPDATE public.products
  SET category_id = v_ethnic
  WHERE slug IN ('organza-silk-saree', 'reman-glass-three-piece');

  -- Existing Outerwear records are contemporary apparel and map safely to Western.
  IF v_outerwear IS NOT NULL THEN
    UPDATE public.products
    SET category_id = v_western
    WHERE category_id = v_outerwear;

    UPDATE public.categories
    SET name = 'Legacy Outerwear',
        description = 'Inactive legacy category retained for historical compatibility.',
        is_active = false
    WHERE id = v_outerwear;
  END IF;

  -- Accessories products are retained untouched for manual review; only the category is legacy/inactive.
  IF v_accessories IS NOT NULL THEN
    UPDATE public.categories
    SET name = 'Legacy Accessories',
        description = 'Inactive legacy category retained for products pending taxonomy review.',
        is_active = false
    WHERE id = v_accessories;
  END IF;
END $$;

-- Keep the primary taxonomy deterministic if this migration is reapplied.
UPDATE public.categories
SET is_active = false
WHERE slug IN ('outerwear', 'accessories');
