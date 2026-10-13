-- Migration: 20261013000000_reconcile_variants_and_stock.sql
-- Description: Authoritative transactional variant reconciliation, stock synchronization, and deleted variant deactivation

CREATE OR REPLACE FUNCTION public.reconcile_product_variants(
  p_product_id UUID,
  p_variants JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_caller_seller_id UUID;
  v_is_admin BOOLEAN;
  v_prod RECORD;
  v_var_elem JSONB;
  v_var_id UUID;
  v_size TEXT;
  v_colour TEXT;
  v_sku TEXT;
  v_qty INT;
  v_price_override NUMERIC(10,2);
  v_weight_override NUMERIC(10,2);
  v_matched_id UUID;
  v_new_id UUID;
  v_retained_ids UUID[] := '{}';
  v_deactivated_count INT := 0;
  v_updated_count INT := 0;
  v_inserted_count INT := 0;
  v_total_stock INT := 0;
  v_rec RECORD;
BEGIN
  -- 1. Authorization checks
  v_is_admin := public.is_admin();
  v_caller_seller_id := public.get_current_seller_id();

  SELECT id, seller_id, name, slug INTO v_prod
  FROM public.products
  WHERE id = p_product_id;

  IF v_prod.id IS NULL THEN
    RAISE EXCEPTION 'Product % not found.', p_product_id;
  END IF;

  IF NOT v_is_admin THEN
    IF v_caller_seller_id IS NULL OR v_prod.seller_id <> v_caller_seller_id THEN
      RAISE EXCEPTION 'Unauthorized: seller does not own product %.', p_product_id;
    END IF;
  END IF;

  -- 2. Validate input array
  IF p_variants IS NULL OR jsonb_array_length(p_variants) = 0 THEN
    RAISE EXCEPTION 'At least one variant must be configured for the product.';
  END IF;

  -- 3. Reconcile each incoming variant
  FOR v_var_elem IN SELECT value FROM jsonb_array_elements(p_variants)
  LOOP
    v_var_id := NULL;
    IF (v_var_elem->>'id') IS NOT NULL AND (v_var_elem->>'id') ~ '^[0-9a-fA-F-]{36}$' THEN
      v_var_id := (v_var_elem->>'id')::UUID;
    END IF;

    v_size := NULLIF(TRIM(v_var_elem->>'size'), '');
    v_colour := NULLIF(TRIM(v_var_elem->>'colour'), '');
    v_sku := TRIM(COALESCE(v_var_elem->>'sku', ''));
    v_qty := GREATEST(0, COALESCE((v_var_elem->>'quantity')::INT, 0));
    
    v_price_override := NULL;
    IF (v_var_elem->>'price_override') IS NOT NULL AND (v_var_elem->>'price_override') <> '' THEN
      v_price_override := (v_var_elem->>'price_override')::NUMERIC;
    END IF;

    v_weight_override := NULL;
    IF (v_var_elem->>'weight_grams_override') IS NOT NULL AND (v_var_elem->>'weight_grams_override') <> '' THEN
      v_weight_override := (v_var_elem->>'weight_grams_override')::NUMERIC;
    END IF;

    -- Find matching existing variant for this product
    v_matched_id := NULL;

    -- Strategy A: Match by explicit variant ID
    IF v_var_id IS NOT NULL THEN
      SELECT id INTO v_matched_id
      FROM public.product_variants
      WHERE id = v_var_id AND product_id = p_product_id;
    END IF;

    -- Strategy B: Match by unique size & colour combination
    IF v_matched_id IS NULL THEN
      SELECT id INTO v_matched_id
      FROM public.product_variants
      WHERE product_id = p_product_id
        AND COALESCE(LOWER(TRIM(size)), '') = COALESCE(LOWER(TRIM(v_size)), '')
        AND COALESCE(LOWER(TRIM(colour)), '') = COALESCE(LOWER(TRIM(v_colour)), '');
    END IF;

    -- Strategy C: Match by SKU if specified
    IF v_matched_id IS NULL AND v_sku <> '' THEN
      SELECT id INTO v_matched_id
      FROM public.product_variants
      WHERE product_id = p_product_id AND LOWER(TRIM(sku)) = LOWER(v_sku);
    END IF;

    IF v_matched_id IS NOT NULL THEN
      -- Update matched existing variant & mark active
      UPDATE public.product_variants
      SET
        size = v_size,
        colour = v_colour,
        sku = CASE WHEN v_sku <> '' THEN v_sku ELSE sku END,
        price_override = v_price_override,
        weight_grams_override = v_weight_override,
        is_active = true,
        updated_at = timezone('utc'::text, now())
      WHERE id = v_matched_id;

      -- Upsert inventory
      INSERT INTO public.inventory (variant_id, quantity, low_stock_threshold, updated_at)
      VALUES (v_matched_id, v_qty, 5, timezone('utc'::text, now()))
      ON CONFLICT (variant_id)
      DO UPDATE SET
        quantity = v_qty,
        updated_at = timezone('utc'::text, now());

      v_retained_ids := array_append(v_retained_ids, v_matched_id);
      v_updated_count := v_updated_count + 1;
    ELSE
      -- Insert new variant
      IF v_sku = '' THEN
        v_sku := UPPER(v_prod.slug) || '-' || COALESCE(UPPER(SUBSTRING(v_colour FROM 1 FOR 3)), 'STD') || '-' || COALESCE(UPPER(v_size), 'OS') || '-' || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 4);
      END IF;

      INSERT INTO public.product_variants (
        product_id, size, colour, sku, price_override, weight_grams_override, is_active
      ) VALUES (
        p_product_id, v_size, v_colour, v_sku, v_price_override, v_weight_override, true
      ) RETURNING id INTO v_new_id;

      INSERT INTO public.inventory (variant_id, quantity, low_stock_threshold, updated_at)
      VALUES (v_new_id, v_qty, 5, timezone('utc'::text, now()));

      v_retained_ids := array_append(v_retained_ids, v_new_id);
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  -- 4. Deactivate removed variants (protect historical references in order_items)
  FOR v_rec IN
    SELECT id, sku
    FROM public.product_variants
    WHERE product_id = p_product_id
      AND NOT (id = ANY(v_retained_ids))
      AND is_active = true
  LOOP
    -- Safely mark inactive so historical orders remain valid, but variant cannot be purchased or shown
    UPDATE public.product_variants
    SET is_active = false, updated_at = timezone('utc'::text, now())
    WHERE id = v_rec.id;

    -- Zero out inventory for deactivated variant
    UPDATE public.inventory
    SET quantity = 0, updated_at = timezone('utc'::text, now())
    WHERE variant_id = v_rec.id;

    v_deactivated_count := v_deactivated_count + 1;
  END LOOP;

  -- 5. Calculate total active inventory & synchronize is_sold_out
  SELECT COALESCE(SUM(i.quantity), 0) INTO v_total_stock
  FROM public.product_variants pv
  JOIN public.inventory i ON i.variant_id = pv.id
  WHERE pv.product_id = p_product_id
    AND pv.is_active = true;

  IF v_total_stock > 0 THEN
    UPDATE public.products
    SET is_sold_out = false, updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id AND is_sold_out = true;
  ELSE
    UPDATE public.products
    SET is_sold_out = true, updated_at = timezone('utc'::text, now())
    WHERE id = p_product_id AND is_sold_out = false;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'product_id', p_product_id,
    'retained_count', array_length(v_retained_ids, 1),
    'updated_count', v_updated_count,
    'inserted_count', v_inserted_count,
    'deactivated_count', v_deactivated_count,
    'total_stock', v_total_stock,
    'is_sold_out', (v_total_stock = 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_product_variants(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_product_variants(UUID, JSONB) TO service_role;
