-- SENO: product-level shipping and category management helpers.
-- Additive migration; preserves existing products, orders, and shipping APIs.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shipping_method TEXT NOT NULL DEFAULT 'weight_based'
    CHECK (shipping_method IN ('weight_based', 'custom')),
  ADD COLUMN IF NOT EXISTS custom_delivery_charge NUMERIC(10,2)
    CHECK (custom_delivery_charge IS NULL OR custom_delivery_charge >= 0);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_custom_delivery_charge_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_custom_delivery_charge_check
  CHECK (shipping_method = 'weight_based' OR custom_delivery_charge IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_products_shipping_method
  ON public.products(shipping_method);

-- Custom charges are applied once per product line. Weight-based lines are
-- aggregated and calculated by the existing global shipping configuration.
CREATE OR REPLACE FUNCTION public.calculate_shipping(
  p_subtotal NUMERIC,
  p_weight_grams NUMERIC,
  p_custom_delivery_charge NUMERIC DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp AS $$
DECLARE
  v_weight_shipping NUMERIC := 0;
  v_settings RECORD;
  v_slab_rate NUMERIC;
  v_extra_weight NUMERIC;
  v_units NUMERIC;
BEGIN
  IF COALESCE(p_custom_delivery_charge, 0) < 0 THEN
    RAISE EXCEPTION 'Custom delivery charge cannot be negative.';
  END IF;

  SELECT * INTO v_settings
  FROM public.shipping_settings
  WHERE is_active = true
  LIMIT 1;

  IF p_subtotal >= COALESCE(v_settings.free_shipping_threshold, 1999.00) THEN
    RETURN 0.00;
  END IF;

  IF v_settings IS NULL THEN
    IF p_weight_grams <= 500.00 THEN
      v_weight_shipping := 70.00;
    ELSE
      v_extra_weight := p_weight_grams - 500.00;
      v_units := CEIL(v_extra_weight / 500.00);
      v_weight_shipping := 70.00 + (v_units * 20.00);
    END IF;
  ELSIF v_settings.calculation_mode = 'base_incremental' THEN
    IF p_weight_grams <= v_settings.base_weight_grams THEN
      v_weight_shipping := v_settings.base_rate;
    ELSE
      v_extra_weight := p_weight_grams - v_settings.base_weight_grams;
      v_units := CEIL(v_extra_weight / v_settings.incremental_weight_grams);
      v_weight_shipping := v_settings.base_rate + (v_units * v_settings.incremental_rate);
    END IF;
  ELSIF v_settings.calculation_mode = 'weight_slab' THEN
    SELECT rate INTO v_slab_rate
    FROM public.shipping_weight_rules
    WHERE is_active = true
      AND min_weight_grams <= p_weight_grams
      AND max_weight_grams > p_weight_grams
    ORDER BY min_weight_grams ASC
    LIMIT 1;

    IF v_slab_rate IS NULL THEN
      SELECT rate INTO v_slab_rate
      FROM public.shipping_weight_rules
      WHERE is_active = true
      ORDER BY max_weight_grams DESC
      LIMIT 1;
    END IF;

    v_weight_shipping := COALESCE(v_slab_rate, v_settings.base_rate);
  ELSE
    v_weight_shipping := 70.00;
  END IF;

  RETURN ROUND(v_weight_shipping + COALESCE(p_custom_delivery_charge, 0), 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_shipping(NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated;

-- Patch the already deployed order function without changing its public signature.
-- This keeps existing idempotency, locks, payments, and order snapshots intact.
DO $$
DECLARE
  v_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_order'
    AND pg_get_function_identity_arguments(p.oid) LIKE 'jsonb, jsonb, jsonb, text, uuid, text%'
  LIMIT 1;

  IF v_definition IS NOT NULL AND v_definition NOT LIKE '%v_custom_shipping%' THEN
    v_definition := replace(v_definition, 'v_total_weight NUMERIC(10,2) := 0.00;', E'v_total_weight NUMERIC(10,2) := 0.00;\n  v_custom_shipping NUMERIC(10,2) := 0.00;');
    v_definition := replace(v_definition, 'p.default_weight_grams,', E'p.default_weight_grams,\n      p.shipping_method,\n      p.custom_delivery_charge,');
    v_definition := replace(v_definition, 'v_total_weight := v_total_weight + v_line_weight;', E'v_total_weight := v_total_weight + v_line_weight;\n    IF v_item_rec.shipping_method = ''custom'' THEN\n      v_custom_shipping := v_custom_shipping + COALESCE(v_item_rec.custom_delivery_charge, 0.00);\n    END IF;');
    v_definition := replace(v_definition, 'public.calculate_shipping(v_subtotal, v_total_weight)', 'public.calculate_shipping(v_subtotal, v_total_weight, v_custom_shipping)');
    EXECUTE v_definition;
  END IF;
END $$;

-- Admin category mutations use these functions so slug uniqueness and safe
-- deactivation are enforced server-side as well as by the UI.
CREATE OR REPLACE FUNCTION public.admin_deactivate_category(p_category_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_active_products INT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*) INTO v_active_products
  FROM public.products
  WHERE category_id = p_category_id AND is_active = true;

  UPDATE public.categories SET is_active = false WHERE id = p_category_id;
  RETURN jsonb_build_object('active_product_count', v_active_products);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_deactivate_category(UUID) TO authenticated;
