-- ==============================================================================
-- SENO MARKETPLACE — COMBINED-WEIGHT DELIVERY RULES & DYNAMIC SLABS
-- Migration: 20261028010000_combined_weight_shipping_rules.sql
-- ==============================================================================
-- Description:
-- 1. Updates public.calculate_shipping to enforce SENO's combined-weight delivery rules:
--    - Combined chargeable weight <= 600 grams: ₹60.00
--    - Combined chargeable weight > 600 grams: ₹120.00
--    - Exactly 600 grams remains in the ₹60 tier.
--    - Complimentary shipping threshold: ₹1,999.00
--    - Non-negative validation on weights and custom delivery charges.
--    - Preserves custom-delivery products and mixed-cart summation.
-- 2. Updates default shipping_settings and seeds active 600g / 1200g weight slabs.
-- ==============================================================================

-- 1. Update public.calculate_shipping
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
BEGIN
  IF COALESCE(p_custom_delivery_charge, 0) < 0 THEN
    RAISE EXCEPTION 'Custom delivery charge cannot be negative.';
  END IF;

  IF COALESCE(p_weight_grams, 0) < 0 THEN
    RAISE EXCEPTION 'Shipping weight cannot be negative.';
  END IF;

  SELECT * INTO v_settings
  FROM public.shipping_settings
  WHERE is_active = true
  LIMIT 1;

  -- 1. Free shipping threshold
  IF p_subtotal >= COALESCE(v_settings.free_shipping_threshold, 1999.00) THEN
    RETURN 0.00;
  END IF;

  -- 2. Weight-based delivery calculation
  IF COALESCE(p_weight_grams, 0) <= 0 THEN
    v_weight_shipping := 0.00;
  ELSIF v_settings IS NOT NULL AND v_settings.calculation_mode = 'weight_slab' THEN
    SELECT rate INTO v_slab_rate
    FROM public.shipping_weight_rules
    WHERE is_active = true
      AND p_weight_grams <= max_weight_grams
    ORDER BY max_weight_grams ASC
    LIMIT 1;

    IF v_slab_rate IS NULL THEN
      SELECT rate INTO v_slab_rate
      FROM public.shipping_weight_rules
      WHERE is_active = true
      ORDER BY max_weight_grams DESC
      LIMIT 1;
    END IF;

    v_weight_shipping := COALESCE(v_slab_rate, CASE WHEN p_weight_grams <= 600.00 THEN 60.00 ELSE 120.00 END);
  ELSE
    -- SENO standard combined-weight delivery rules:
    -- Combined chargeable weight <= 600 grams: ₹60.00
    -- Combined chargeable weight > 600 grams: ₹120.00
    -- Exactly 600g remains in the ₹60 tier.
    IF p_weight_grams <= 600.00 THEN
      v_weight_shipping := 60.00;
    ELSE
      v_weight_shipping := 120.00;
    END IF;
  END IF;

  RETURN ROUND(v_weight_shipping + COALESCE(p_custom_delivery_charge, 0), 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_shipping(NUMERIC, NUMERIC, NUMERIC) TO anon, authenticated, service_role;

-- 2. Update shipping settings to reflect SENO rates
UPDATE public.shipping_settings
SET calculation_mode = 'weight_slab',
    free_shipping_threshold = 1999.00,
    base_weight_grams = 600.00,
    base_rate = 60.00,
    incremental_weight_grams = 600.00,
    incremental_rate = 60.00,
    updated_at = timezone('utc'::text, now())
WHERE is_active = true;

-- 3. Seed active weight slabs if none exist
INSERT INTO public.shipping_weight_rules (min_weight_grams, max_weight_grams, rate, display_order, is_active)
SELECT 0.00, 600.00, 60.00, 1, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_weight_rules WHERE is_active = true AND max_weight_grams = 600.00
);

INSERT INTO public.shipping_weight_rules (min_weight_grams, max_weight_grams, rate, display_order, is_active)
SELECT 600.00, 9999999.00, 120.00, 2, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.shipping_weight_rules WHERE is_active = true AND max_weight_grams > 600.00
);

