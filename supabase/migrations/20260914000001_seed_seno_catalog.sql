-- ==============================================================================
-- SENO FASHION MARKETPLACE - STAGE 3 MIGRATION
-- Migration: 20260914000001_seed_seno_catalog.sql
-- Description: Seed 18 platform products, categories, collections and variants.
-- ==============================================================================

DO $$
DECLARE
  v_platform_id UUID;
  v_cat_topwear UUID;
  v_cat_bottomwear UUID;
  v_cat_outerwear UUID;
  v_cat_accessories UUID;
  v_col_new UUID;
  v_col_bestsellers UUID;
  v_product_id UUID;
  v_variant_id UUID;
BEGIN
  -- 1. Get Platform Seller ID
  SELECT id INTO v_platform_id FROM public.sellers WHERE seller_type = 'platform' LIMIT 1;
  IF v_platform_id IS NULL THEN
    RAISE EXCEPTION 'Platform seller not found.';
  END IF;

  -- 2. Upsert Categories
  INSERT INTO public.categories (name, slug, description, display_order)
  VALUES 
    ('Topwear', 'topwear', 'Shirts, Tanks & Cardigans', 1),
    ('Bottomwear', 'bottomwear', 'Pleated Trousers & Cargo Pants', 2),
    ('Outerwear', 'outerwear', 'Selvedge Denim & Wool Blazers', 3),
    ('Accessories', 'accessories', 'Canvas Totes & Brushed Wool', 4)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;
  
  SELECT id INTO v_cat_topwear FROM public.categories WHERE slug = 'topwear';
  SELECT id INTO v_cat_bottomwear FROM public.categories WHERE slug = 'bottomwear';
  SELECT id INTO v_cat_outerwear FROM public.categories WHERE slug = 'outerwear';
  SELECT id INTO v_cat_accessories FROM public.categories WHERE slug = 'accessories';

  -- 3. Upsert Collections
  INSERT INTO public.collections (name, slug, description)
  VALUES 
    ('New Arrivals', 'new-arrivals', 'Curated Releases'),
    ('Bestsellers', 'bestsellers', 'Essential Staples')
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_col_new FROM public.collections WHERE slug = 'new-arrivals';
  SELECT id INTO v_col_bestsellers FROM public.collections WHERE slug = 'bestsellers';

  -- Product: Seno Raw Denim Jacket
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Outerwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Seno Raw Denim Jacket', 'seno-raw-denim-jacket', 'A structured, unwashed Japanese raw denim jacket designed for long-term wear and natural patina. Features dropped shoulders and clean welt pockets.', '["14.5oz Japanese Selvedge Denim","Custom matte silver tack buttons","Internal chest pocket","Made in limited quantities"]'::jsonb,
    12900, 14500, 900, false, true, true, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85', 1, false);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=85', 2, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Indigo', 'SENO-OUT-IND-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Raw Black', 'SENO-OUT-RBK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Indigo', 'SENO-OUT-IND-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Raw Black', 'SENO-OUT-RBK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Indigo', 'SENO-OUT-IND-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Raw Black', 'SENO-OUT-RBK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Indigo', 'SENO-OUT-IND-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Raw Black', 'SENO-OUT-RBK-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_new, v_product_id) ON CONFLICT DO NOTHING;
    
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_bestsellers, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Contour Rib Tank
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Topwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Contour Rib Tank', 'contour-rib-tank', 'Heavyweight organic cotton rib tank top with custom high neck binding. Engineered to hold shape through continuous wash and wear.', '["95% Organic Cotton, 5% Elastane","260 GSM heavy rib","High binding neckline","Preshrunk fabric"]'::jsonb,
    3900, NULL, 150, false, false, true, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XS', 'White', 'SENO-TOP-WHT-XS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XS', 'Black', 'SENO-TOP-BLK-XS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XS', 'Oat', 'SENO-TOP-OAT-XS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'White', 'SENO-TOP-WHT-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Black', 'SENO-TOP-BLK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Oat', 'SENO-TOP-OAT-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'White', 'SENO-TOP-WHT-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Black', 'SENO-TOP-BLK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Oat', 'SENO-TOP-OAT-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'White', 'SENO-TOP-WHT-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Black', 'SENO-TOP-BLK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Oat', 'SENO-TOP-OAT-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_bestsellers, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Transit Wide Trousers
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Bottomwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Transit Wide Trousers', 'transit-wide-trousers', 'Relaxed double-pleated trousers in lightweight wool-blend drape. Tailored with a deep rise and wide leg profile.', '["60% Wool, 40% Viscose","Double front pleats","Hidden waist button slider","Dry clean only"]'::jsonb,
    8900, NULL, 450, false, false, true, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Charcoal', 'SENO-BTM-CHR-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Olive', 'SENO-BTM-OLV-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Charcoal', 'SENO-BTM-CHR-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Olive', 'SENO-BTM-OLV-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Charcoal', 'SENO-BTM-CHR-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Olive', 'SENO-BTM-OLV-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Charcoal', 'SENO-BTM-CHR-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Olive', 'SENO-BTM-OLV-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_bestsellers, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: No. 07 Mesh Long Sleeve
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Topwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'No. 07 Mesh Long Sleeve', 'no-07-mesh-long-sleeve', 'Semi-sheer technical fine mesh long sleeve tee designed for subtle layering and tactile texture.', '["100% Recycled Polyester Mesh","Raw cut hem","Thumbhole cuffs","Relaxed silhouette"]'::jsonb,
    5900, NULL, 120, false, true, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Black', 'SENO-TOP-BLK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Smoke', 'SENO-TOP-SMK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Black', 'SENO-TOP-BLK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Smoke', 'SENO-TOP-SMK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Black', 'SENO-TOP-BLK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Smoke', 'SENO-TOP-SMK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_new, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Uniform Pleated Skirt
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Bottomwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Uniform Pleated Skirt', 'uniform-pleated-skirt', 'Architectural midi skirt with sharp knife pleats and an asymmetric front vent for fluid movement.', '["Poly-twill crease-resistant weave","Side concealed zipper","Internal waistband stay"]'::jsonb,
    7900, NULL, 300, false, false, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XS', 'Stone', 'SENO-BTM-STN-XS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XS', 'Black', 'SENO-BTM-BLK-XS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Stone', 'SENO-BTM-STN-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Black', 'SENO-BTM-BLK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Stone', 'SENO-BTM-STN-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Black', 'SENO-BTM-BLK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Stone', 'SENO-BTM-STN-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Black', 'SENO-BTM-BLK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
        -- Product: Archive Work Shirt
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Topwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Archive Work Shirt', 'archive-work-shirt', 'Utility button-down cut from washed cotton poplin with reinforced chest flap pockets.', '["100% Washed Cotton Poplin","Dual gusseted chest pockets","Horn-effect buttons"]'::jsonb,
    6900, NULL, 250, false, false, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Blue', 'SENO-TOP-BLU-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 0)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Khaki', 'SENO-TOP-KHK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 0)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Blue', 'SENO-TOP-BLU-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 0)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Khaki', 'SENO-TOP-KHK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 0)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Blue', 'SENO-TOP-BLU-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 0)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Khaki', 'SENO-TOP-KHK-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 0)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
        -- Product: Everyday Canvas Tote
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Accessories' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Everyday Canvas Tote', 'everyday-canvas-tote', 'Heavy 18oz cotton duck canvas carry-all tote with double-stitched web handles and internal zip pocket.', '["18oz Heavy Cotton Canvas","Internal key lanyard","Screen-printed Studio / 01 graphic"]'::jsonb,
    3200, NULL, 500, false, false, true, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'One size', 'Black', 'SENO-ACC-BLK-OS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'One size', 'Off-White', 'SENO-ACC-OWH-OS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_bestsellers, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Form 02 Tailored Blazer
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Outerwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Form 02 Tailored Blazer', 'form-02-tailored-blazer', 'Single-breasted relaxed blazer crafted from structured tropical wool with clean notch lapels.', '["100% Tropical Wool","Cupro lining","Welt chest pocket & interior flap pockets"]'::jsonb,
    14900, 16900, 650, false, false, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Black', 'SENO-OUT-BLK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Grey Slate', 'SENO-OUT-GSL-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Black', 'SENO-OUT-BLK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Grey Slate', 'SENO-OUT-GSL-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Black', 'SENO-OUT-BLK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Grey Slate', 'SENO-OUT-GSL-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
        -- Product: Daily Cotton Shirt
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Topwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Daily Cotton Shirt', 'daily-cotton-shirt', 'Boxy poplin shirt with a spread collar and subtle back box pleat for an effortless silhouette.', '["Organic Crisp Cotton Poplin","Mother of pearl buttons","Curved hemline"]'::jsonb,
    6200, NULL, 200, false, true, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Cream', 'SENO-TOP-CRM-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Sky Blue', 'SENO-TOP-SKY-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Cream', 'SENO-TOP-CRM-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Sky Blue', 'SENO-TOP-SKY-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Cream', 'SENO-TOP-CRM-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Sky Blue', 'SENO-TOP-SKY-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Cream', 'SENO-TOP-CRM-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Sky Blue', 'SENO-TOP-SKY-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_new, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Utility Cargo Pant
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Bottomwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Utility Cargo Pant', 'utility-cargo-pant', 'Tactile cotton ripstop trousers featuring angled side flap pockets and adjustable hem cinches.', '["100% Cotton Ripstop","Articulated knee darts","Drawstring hem closures"]'::jsonb,
    9800, NULL, 500, false, false, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Olive', 'SENO-BTM-OLV-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Washed Black', 'SENO-BTM-WBK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Olive', 'SENO-BTM-OLV-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Washed Black', 'SENO-BTM-WBK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Olive', 'SENO-BTM-OLV-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Washed Black', 'SENO-BTM-WBK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Olive', 'SENO-BTM-OLV-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Washed Black', 'SENO-BTM-WBK-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
        -- Product: Studio Cap
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Accessories' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Studio Cap', 'studio-cap', 'Unstructured 6-panel cap crafted from washed twill with tonal SENO embroidery.', '["100% Cotton Twill","Adjustable brass buckle strap","Tonal embroidery"]'::jsonb,
    2400, NULL, 100, false, false, true, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'One size', 'Black', 'SENO-ACC-BLK-OS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'One size', 'Khaki', 'SENO-ACC-KHK-OS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_bestsellers, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Soft Form Cardigan
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Topwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Soft Form Cardigan', 'soft-form-cardigan', 'V-neck cardigan knit from soft merino wool blend with chunky horn buttons.', '["70% Merino Wool, 30% Alpaca","Ribbed cuffs and hem","Relaxed fit"]'::jsonb,
    7400, NULL, 350, false, false, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Oat', 'SENO-TOP-OAT-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Charcoal', 'SENO-TOP-CHR-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Oat', 'SENO-TOP-OAT-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Charcoal', 'SENO-TOP-CHR-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Oat', 'SENO-TOP-OAT-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Charcoal', 'SENO-TOP-CHR-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
        -- Product: Field Overshirt
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Outerwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Field Overshirt', 'field-overshirt', 'Heavyweight cotton canvas overshirt designed for transitional weather layering.', '["100% Heavy Cotton Canvas","Double needle seam stitching","Dual flap chest pockets"]'::jsonb,
    10800, NULL, 600, false, true, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1598808503746-f34c53b9323e?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Moss', 'SENO-OUT-MOS-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Tan', 'SENO-OUT-TAN-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Moss', 'SENO-OUT-MOS-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Tan', 'SENO-OUT-TAN-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Moss', 'SENO-OUT-MOS-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Tan', 'SENO-OUT-TAN-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Moss', 'SENO-OUT-MOS-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Tan', 'SENO-OUT-TAN-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_new, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Linea Slip Dress
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Topwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Linea Slip Dress', 'linea-slip-dress', 'Fluid bias-cut satin dress with ultra-thin shoulder straps and a subtle cowl neckline.', '["100% Matte Silk Satin","Adjustable straps","Fully lined"]'::jsonb,
    8600, NULL, 150, false, true, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XS', 'Ink', 'SENO-TOP-INK-XS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XS', 'Champagne', 'SENO-TOP-CHP-XS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Ink', 'SENO-TOP-INK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Champagne', 'SENO-TOP-CHP-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Ink', 'SENO-TOP-INK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Champagne', 'SENO-TOP-CHP-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Ink', 'SENO-TOP-INK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Champagne', 'SENO-TOP-CHP-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_new, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Soft Utility Scarf
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Accessories' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Soft Utility Scarf', 'soft-utility-scarf', 'Generously proportioned brushed wool scarf finished with raw fringed edges.', '["100% Pure Brushed Lambswool","Dimension: 200cm x 45cm","Woven SENO care label"]'::jsonb,
    2800, NULL, 200, false, false, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'One size', 'Clay', 'SENO-ACC-CLY-OS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'One size', 'Charcoal', 'SENO-ACC-CHR-OS', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
        -- Product: Studio Sweat
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Topwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Studio Sweat', 'studio-sweat', 'Heavy French terry crewneck sweatshirt with dropped shoulders and ribbed gussets.', '["450 GSM Organic French Terry","Pre-shrunk finish","Reinforced rib collar"]'::jsonb,
    7200, NULL, 450, false, false, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Grey', 'SENO-TOP-GRY-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Black', 'SENO-TOP-BLK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Grey', 'SENO-TOP-GRY-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Black', 'SENO-TOP-BLK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Grey', 'SENO-TOP-GRY-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Black', 'SENO-TOP-BLK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Grey', 'SENO-TOP-GRY-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'XL', 'Black', 'SENO-TOP-BLK-XL', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
        -- Product: Minimalist Leather Belt
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Accessories' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Minimalist Leather Belt', 'minimalist-leather-belt', 'Vegetable-tanned full grain leather belt with custom brushed steel roller buckle.', '["Full grain Italian leather","30mm width","Brushed steel hardware"]'::jsonb,
    3600, NULL, 150, false, true, false, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Black', 'SENO-ACC-BLK-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Tan', 'SENO-ACC-TAN-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Black', 'SENO-ACC-BLK-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Tan', 'SENO-ACC-TAN-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Black', 'SENO-ACC-BLK-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Tan', 'SENO-ACC-TAN-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_new, v_product_id) ON CONFLICT DO NOTHING;
      -- Product: Structured Wool Coat
  INSERT INTO public.products (
    seller_id, category_id, name, slug, description, details, price, compare_at_price,
    default_weight_grams, is_featured, is_new, is_bestseller, is_active, approval_status
  )
  VALUES (
    v_platform_id, 
    CASE 'Outerwear' 
      WHEN 'Topwear' THEN v_cat_topwear 
      WHEN 'Bottomwear' THEN v_cat_bottomwear 
      WHEN 'Outerwear' THEN v_cat_outerwear 
      WHEN 'Accessories' THEN v_cat_accessories 
    END,
    'Structured Wool Coat', 'structured-wool-coat', 'Double-breasted long trench coat cut from heavy Melton wool with a waist belt tie.', '["80% Melton Wool, 20% Nylon","Storm flap panel","Deep side slant pockets"]'::jsonb,
    18900, NULL, 1200, false, false, true, true, 'approved'
  )
  ON CONFLICT (slug) DO UPDATE SET 
    price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, 
    is_new = EXCLUDED.is_new, is_bestseller = EXCLUDED.is_bestseller
  RETURNING id INTO v_product_id;
  
  DELETE FROM public.product_images WHERE product_id = v_product_id;
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85', 0, true);
  INSERT INTO public.product_images (product_id, url, display_order, is_primary)
  VALUES (v_product_id, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=85', 1, false);

  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Camel', 'SENO-OUT-CML-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'S', 'Dark Navy', 'SENO-OUT-DNV-S', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Camel', 'SENO-OUT-CML-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'M', 'Dark Navy', 'SENO-OUT-DNV-M', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Camel', 'SENO-OUT-CML-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.product_variants (product_id, size, colour, sku, is_active)
  VALUES (v_product_id, 'L', 'Dark Navy', 'SENO-OUT-DNV-L', true)
  ON CONFLICT (sku) DO UPDATE SET is_active = EXCLUDED.is_active
  RETURNING id INTO v_variant_id;

  INSERT INTO public.inventory (variant_id, quantity)
  VALUES (v_variant_id, 1)
  ON CONFLICT (variant_id) DO UPDATE SET quantity = EXCLUDED.quantity;
      
  INSERT INTO public.collection_products (collection_id, product_id)
  VALUES (v_col_bestsellers, v_product_id) ON CONFLICT DO NOTHING;
    
END $$;
