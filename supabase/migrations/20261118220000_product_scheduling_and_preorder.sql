-- ==============================================================================
-- SENO MARKETPLACE — PRODUCT SCHEDULING & PRE-ORDER SYSTEM
-- Migration: 20261118220000_product_scheduling_and_preorder.sql
-- ==============================================================================

-- 1. Extend products table with scheduling and pre-order capabilities
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS availability_mode text NOT NULL DEFAULT 'available_now',
ADD COLUMN IF NOT EXISTS release_date timestamptz NULL,
ADD COLUMN IF NOT EXISTS preorder_start_date timestamptz NULL,
ADD COLUMN IF NOT EXISTS preorder_end_date timestamptz NULL,
ADD COLUMN IF NOT EXISTS expected_dispatch_date text NULL,
ADD COLUMN IF NOT EXISTS notify_subscribers boolean NOT NULL DEFAULT true;

-- Enforce valid availability modes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_availability_mode'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT chk_products_availability_mode
    CHECK (availability_mode IN ('available_now', 'coming_soon', 'pre_order'));
  END IF;
END $$;

-- 2. Extend orders and order_items with pre-order tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false;

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS is_preorder boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_dispatch_date text NULL;

-- 3. Scheduled Product Activation Function (Server & Database Authoritative)
-- Scans approved products whose release_date has arrived and transitions them to 'available_now'
CREATE OR REPLACE FUNCTION public.activate_scheduled_products()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_activated_count integer := 0;
BEGIN
  UPDATE public.products
  SET availability_mode = 'available_now',
      updated_at = timezone('utc'::text, now())
  WHERE availability_mode = 'coming_soon'
    AND release_date IS NOT NULL
    AND release_date <= timezone('utc'::text, now())
    AND approval_status = 'approved';

  GET DIAGNOSTICS v_activated_count = ROW_COUNT;
  RETURN v_activated_count;
END;
$$;

-- 4. Update public.create_order to strictly enforce scheduling & handle pre-orders
CREATE OR REPLACE FUNCTION public.create_order(
  p_items JSONB,
  p_shipping_address JSONB,
  p_billing_address JSONB DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_address_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_customer_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(10,2) := 0.00;
  v_total_weight NUMERIC(10,2) := 0.00;
  v_weight_based_weight NUMERIC(10,2) := 0.00;
  v_custom_shipping NUMERIC(10,2) := 0.00;
  v_shipping_amount NUMERIC(10,2) := 0.00;
  v_total_amount NUMERIC(10,2) := 0.00;
  v_item_elem JSONB;
  v_var_id UUID;
  v_req_qty INT;
  v_curr_stock INT;
  v_existing_order RECORD;
  v_final_shipping_addr JSONB;
  v_final_billing_addr JSONB;

  -- Item record from database query
  v_item_rec RECORD;
  v_unit_price NUMERIC(10,2);
  v_unit_weight NUMERIC(10,2);
  v_line_total NUMERIC(10,2);
  v_line_weight NUMERIC(10,2);
  v_comm_rate NUMERIC(5,2);
  v_comm_amount NUMERIC(10,2);
  v_seller_payout NUMERIC(10,2);

  -- Delivery date tracking variables
  v_item_delivery_days INT;
  v_item_estimated_date TIMESTAMPTZ;
  v_max_order_delivery_days INT := 1;
  v_order_expected_date TIMESTAMPTZ;
  v_current_kolkata_date DATE;

  -- Pre-order tracking
  v_order_has_preorder BOOLEAN := false;
  v_item_is_preorder BOOLEAN := false;
  v_item_dispatch_date TEXT := NULL;

  -- Temporary storage for validated items before insertion
  v_order_items_arr JSONB := '[]'::jsonb;
  v_validated_item JSONB;
BEGIN
  -- 1. Authenticated customer enforcement
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to place an order.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_customer_id) THEN
    RAISE EXCEPTION 'Customer profile not found.';
  END IF;

  -- Compute current calendar date in Asia/Kolkata
  v_current_kolkata_date := (timezone('Asia/Kolkata', now()))::DATE;

  -- 2. Idempotency check: prevent duplicate checkout submissions
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    SELECT o.id, o.order_number, o.status, o.payment_status, o.subtotal_amount,
           o.shipping_amount, o.total_amount, o.total_weight_grams,
           o.expected_delivery_date, o.expected_delivery_days, o.is_preorder
    INTO v_existing_order
    FROM public.order_idempotency_keys k
    JOIN public.orders o ON o.id = k.order_id
    WHERE k.idempotency_key = p_idempotency_key
      AND k.customer_id = v_customer_id;

    IF v_existing_order.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', true,
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'status', v_existing_order.status,
        'payment_status', v_existing_order.payment_status,
        'subtotal_amount', v_existing_order.subtotal_amount,
        'shipping_amount', v_existing_order.shipping_amount,
        'total_amount', v_existing_order.total_amount,
        'total_weight_grams', v_existing_order.total_weight_grams,
        'expected_delivery_date', v_existing_order.expected_delivery_date,
        'expected_delivery_days', v_existing_order.expected_delivery_days,
        'is_preorder', v_existing_order.is_preorder
      );
    END IF;
  END IF;

  -- 3. Validate items payload
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cart is empty. Please select at least one piece to purchase.';
  END IF;

  -- 4. Validate shipping address structure
  IF p_shipping_address IS NULL OR
     NULLIF(TRIM(p_shipping_address->>'recipient_name'), '') IS NULL OR
     NULLIF(TRIM(p_shipping_address->>'phone'), '') IS NULL OR
     NULLIF(TRIM(p_shipping_address->>'address_line1'), '') IS NULL OR
     NULLIF(TRIM(p_shipping_address->>'city'), '') IS NULL OR
     NULLIF(TRIM(p_shipping_address->>'state'), '') IS NULL OR
     NULLIF(TRIM(p_shipping_address->>'postal_code'), '') IS NULL THEN
    RAISE EXCEPTION 'Complete delivery address with postal code, state, city, and phone is required.';
  END IF;

  v_final_shipping_addr := p_shipping_address;
  v_final_billing_addr := COALESCE(p_billing_address, p_shipping_address);

  -- 5. Process and lock each line item sequentially
  FOR v_item_elem IN 
    SELECT value FROM jsonb_array_elements(p_items) ORDER BY (value->>'variant_id')::UUID ASC
  LOOP
    v_var_id := (v_item_elem->>'variant_id')::UUID;
    v_req_qty := (v_item_elem->>'quantity')::INT;

    IF v_req_qty IS NULL OR v_req_qty <= 0 THEN
      RAISE EXCEPTION 'Quantity for each item must be greater than zero.';
    END IF;

    -- Row-lock inventory atomically
    SELECT quantity INTO v_curr_stock
    FROM public.inventory
    WHERE variant_id = v_var_id
    FOR UPDATE;

    IF v_curr_stock IS NULL THEN
      RAISE EXCEPTION 'Inventory record not found for variant %.', v_var_id;
    END IF;

    IF v_curr_stock < v_req_qty THEN
      RAISE EXCEPTION 'Insufficient stock for requested item. Available: %, Requested: %.', v_curr_stock, v_req_qty;
    END IF;

    -- Fetch authoritative product, variant, seller details & scheduling attributes
    SELECT
      pv.id AS variant_id,
      pv.sku,
      pv.price_override AS variant_price,
      pv.weight_grams_override AS variant_weight,
      pv.is_active AS variant_active,
      pv.size,
      pv.colour,
      p.id AS product_id,
      p.name AS product_name,
      p.price AS product_price,
      p.default_weight_grams,
      p.is_active AS product_active,
      p.is_sold_out AS product_sold_out,
      p.approval_status AS product_approval,
      p.shipping_method,
      p.custom_delivery_charge,
      p.availability_mode,
      p.release_date,
      p.preorder_start_date,
      p.preorder_end_date,
      p.expected_dispatch_date,
      COALESCE(p.expected_delivery_days, 7) AS expected_delivery_days,
      p.seller_id,
      s.seller_status,
      s.commission_rate
    INTO v_item_rec
    FROM public.product_variants pv
    JOIN public.products p ON p.id = pv.product_id
    JOIN public.sellers s ON s.id = p.seller_id
    WHERE pv.id = v_var_id;

    IF v_item_rec.variant_id IS NULL THEN
      RAISE EXCEPTION 'Variant % not found.', v_var_id;
    END IF;

    IF NOT v_item_rec.product_active OR v_item_rec.product_approval <> 'approved' THEN
      RAISE EXCEPTION 'Product "%" is no longer available for purchase.', v_item_rec.product_name;
    END IF;

    IF v_item_rec.product_sold_out THEN
      RAISE EXCEPTION 'Product "%" is marked as Sold Out.', v_item_rec.product_name;
    END IF;

    -- SERVER-AUTHORITATIVE SCHEDULING ENFORCEMENT:
    IF v_item_rec.availability_mode = 'coming_soon' THEN
      IF v_item_rec.release_date IS NOT NULL AND v_item_rec.release_date > timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Product "%" is scheduled for release on % and cannot be purchased early.',
          v_item_rec.product_name, v_item_rec.release_date;
      END IF;
    END IF;

    -- PRE-ORDER VALIDATION:
    v_item_is_preorder := false;
    v_item_dispatch_date := NULL;
    IF v_item_rec.availability_mode = 'pre_order' THEN
      IF v_item_rec.preorder_start_date IS NOT NULL AND v_item_rec.preorder_start_date > timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Pre-orders for "%" have not opened yet.', v_item_rec.product_name;
      END IF;
      IF v_item_rec.preorder_end_date IS NOT NULL AND v_item_rec.preorder_end_date <= timezone('utc'::text, now()) THEN
        RAISE EXCEPTION 'Pre-order window for "%" has closed.', v_item_rec.product_name;
      END IF;
      v_item_is_preorder := true;
      v_order_has_preorder := true;
      v_item_dispatch_date := v_item_rec.expected_dispatch_date;
    END IF;

    IF v_item_rec.seller_status <> 'approved' THEN
      RAISE EXCEPTION 'Seller for product "%" is not active.', v_item_rec.product_name;
    END IF;

    IF NOT v_item_rec.variant_active THEN
      RAISE EXCEPTION 'Variant "%" is currently inactive.', v_item_rec.sku;
    END IF;

    -- Calculate authoritative line pricing and weights
    v_unit_price := COALESCE(v_item_rec.variant_price, v_item_rec.product_price);
    v_unit_weight := COALESCE(v_item_rec.variant_weight, v_item_rec.default_weight_grams, 500.00);
    v_line_total := v_unit_price * v_req_qty;
    v_line_weight := v_unit_weight * v_req_qty;
    v_comm_rate := COALESCE(v_item_rec.commission_rate, 0.00);
    v_comm_amount := ROUND((v_line_total * v_comm_rate / 100.0), 2);
    v_seller_payout := v_line_total - v_comm_amount;

    -- Calculate item expected delivery duration and date
    v_item_delivery_days := GREATEST(1, LEAST(60, v_item_rec.expected_delivery_days));
    v_item_estimated_date := (v_current_kolkata_date + v_item_delivery_days)::TIMESTAMPTZ;

    IF v_item_delivery_days > v_max_order_delivery_days THEN
      v_max_order_delivery_days := v_item_delivery_days;
    END IF;

    -- Deduct stock safely
    UPDATE public.inventory
    SET quantity = quantity - v_req_qty,
        updated_at = timezone('utc'::text, now())
    WHERE variant_id = v_var_id;

    -- Accumulate subtotal & weights
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + v_line_weight;

    IF v_item_rec.shipping_method = 'weight_based' THEN
      v_weight_based_weight := v_weight_based_weight + v_line_weight;
    ELSIF v_item_rec.shipping_method = 'custom' THEN
      v_custom_shipping := v_custom_shipping + (COALESCE(v_item_rec.custom_delivery_charge, 0.00) * v_req_qty);
    END IF;

    -- Store item for bulk insert
    v_validated_item := jsonb_build_object(
      'seller_id', v_item_rec.seller_id,
      'product_id', v_item_rec.product_id,
      'variant_id', v_item_rec.variant_id,
      'product_name', v_item_rec.product_name,
      'sku', v_item_rec.sku,
      'variant_details', jsonb_build_object(
        'size', v_item_rec.size,
        'colour', v_item_rec.colour
      ),
      'unit_price', v_unit_price,
      'unit_weight_grams', v_unit_weight,
      'quantity', v_req_qty,
      'total_price', v_line_total,
      'commission_rate', v_comm_rate,
      'commission_amount', v_comm_amount,
      'seller_payout_amount', v_seller_payout,
      'expected_delivery_days', v_item_delivery_days,
      'estimated_delivery_date', v_item_estimated_date,
      'is_preorder', v_item_is_preorder,
      'expected_dispatch_date', v_item_dispatch_date
    );

    v_order_items_arr := v_order_items_arr || jsonb_build_array(v_validated_item);
  END LOOP;

  -- 6. Shipping calculation
  v_shipping_amount := v_custom_shipping;
  IF v_weight_based_weight > 0 THEN
    v_shipping_amount := v_shipping_amount + (
      CASE 
        WHEN v_subtotal >= 2999.00 THEN 0.00
        ELSE 150.00 + (GREATEST(0, CEIL(v_weight_based_weight / 500.0) - 1) * 50.00)
      END
    );
  END IF;

  v_total_amount := v_subtotal + v_shipping_amount;

  -- Compute consolidated order expected delivery date
  v_order_expected_date := (v_current_kolkata_date + v_max_order_delivery_days)::TIMESTAMPTZ;

  -- 7. Generate order number
  v_order_number := 'SENO-' || TO_CHAR(timezone('utc'::text, now()), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));

  -- 8. Insert order
  INSERT INTO public.orders (
    order_number,
    customer_id,
    status,
    payment_status,
    payment_method,
    subtotal_amount,
    shipping_amount,
    discount_amount,
    total_amount,
    total_weight_grams,
    shipping_address,
    billing_address,
    notes,
    expected_delivery_date,
    expected_delivery_days,
    is_preorder,
    created_at,
    updated_at
  ) VALUES (
    v_order_number,
    v_customer_id,
    'pending',
    'pending',
    'razorpay',
    v_subtotal,
    v_shipping_amount,
    0.00,
    v_total_amount,
    v_total_weight,
    v_final_shipping_addr,
    v_final_billing_addr,
    p_notes,
    v_order_expected_date,
    v_max_order_delivery_days,
    v_order_has_preorder,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_order_id;

  -- 9. Insert order items
  INSERT INTO public.order_items (
    order_id,
    seller_id,
    product_id,
    variant_id,
    product_name,
    sku,
    variant_details,
    unit_price,
    unit_weight_grams,
    quantity,
    total_price,
    commission_rate,
    commission_amount,
    seller_payout_amount,
    fulfillment_status,
    expected_delivery_days,
    estimated_delivery_date,
    is_preorder,
    expected_dispatch_date,
    created_at,
    updated_at
  )
  SELECT
    v_order_id,
    (item->>'seller_id')::UUID,
    (item->>'product_id')::UUID,
    (item->>'variant_id')::UUID,
    item->>'product_name',
    item->>'sku',
    item->'variant_details',
    (item->>'unit_price')::NUMERIC,
    (item->>'unit_weight_grams')::NUMERIC,
    (item->>'quantity')::INT,
    (item->>'total_price')::NUMERIC,
    (item->>'commission_rate')::NUMERIC,
    (item->>'commission_amount')::NUMERIC,
    (item->>'seller_payout_amount')::NUMERIC,
    'pending',
    (item->>'expected_delivery_days')::INT,
    (item->>'estimated_delivery_date')::TIMESTAMPTZ,
    (item->>'is_preorder')::BOOLEAN,
    item->>'expected_dispatch_date',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  FROM jsonb_array_elements(v_order_items_arr) AS item;

  -- 10. Record idempotency key if provided
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    INSERT INTO public.order_idempotency_keys (idempotency_key, customer_id, order_id)
    VALUES (p_idempotency_key, v_customer_id, v_order_id)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal_amount', v_subtotal,
    'shipping_amount', v_shipping_amount,
    'total_amount', v_total_amount,
    'total_weight_grams', v_total_weight,
    'expected_delivery_date', v_order_expected_date,
    'expected_delivery_days', v_max_order_delivery_days,
    'is_preorder', v_order_has_preorder
  );
END;
$$;

