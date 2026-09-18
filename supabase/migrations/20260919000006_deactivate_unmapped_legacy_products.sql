-- Remove products with inactive legacy categories from the public catalog until an admin reviews them.
-- This preserves product rows, slugs, sellers, inventory, and historical order snapshots.

UPDATE public.products
SET is_active = false
WHERE is_active = true
  AND category_id IN (
    SELECT id
    FROM public.categories
    WHERE is_active = false
      AND slug IN ('outerwear', 'accessories')
  );
