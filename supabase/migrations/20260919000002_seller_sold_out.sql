-- Migration: 20260919000002_seller_sold_out.sql
-- Description: Adds is_sold_out column to products and enforces it in create_order

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_products_is_sold_out ON public.products(is_sold_out);

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

  -- 2. Idempotency check: prevent duplicate checkout submissions
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    SELECT o.id, o.order_number, o.status, o.payment_status, o.subtotal_amount, o.shipping_amount, o.total_amount
    INTO v_existing_order
    FROM public.order_idempotency_keys k
    JOIN public.orders o ON o.id = k.order_id
    WHERE k.idempotency_key = p_idempotency_key AND k.customer_id = v_customer_id;

    IF v_existing_order.id IS NOT NULL THEN
      -- Return existing order without re-processing or re-decrementing stock
      RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', true,
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'status', v_existing_order.status,
        'payment_status', v_existing_order.payment_status,
        'subtotal_amount', v_existing_order.subtotal_amount,
        'shipping_amount', v_existing_order.shipping_amount,
        'total_amount', v_existing_order.total_amount
      );
    END IF;
  END IF;

  -- 3. Address Resolution & Customer Ownership Validation
  IF p_address_id IS NOT NULL THEN
    -- Verify address belongs strictly to the authenticated customer
    SELECT jsonb_build_object(
      'recipient_name', recipient_name,
      'phone', phone,
      'address_line1', address_line1,
      'address_line2', address_line2,
      'city', city,
      'state', state,
      'postal_code', postal_code,
      'country', country
    ) INTO v_final_shipping_addr
    FROM public.addresses
    WHERE id = p_address_id AND user_id = v_customer_id;

    IF v_final_shipping_addr IS NULL THEN
      RAISE EXCEPTION 'Selected address was not found or does not belong to your account.';
    END IF;
  ELSE
    v_final_shipping_addr := p_shipping_address;
  END IF;

  -- Validate shipping address structure
  IF v_final_shipping_addr IS NULL
     OR COALESCE(TRIM(v_final_shipping_addr->>'recipient_name'), '') = ''
     OR COALESCE(TRIM(v_final_shipping_addr->>'phone'), '') = ''
     OR COALESCE(TRIM(v_final_shipping_addr->>'address_line1'), '') = ''
     OR COALESCE(TRIM(v_final_shipping_addr->>'city'), '') = ''
     OR COALESCE(TRIM(v_final_shipping_addr->>'state'), '') = ''
     OR COALESCE(TRIM(v_final_shipping_addr->>'postal_code'), '') = '' THEN
    RAISE EXCEPTION 'A complete and valid shipping address is required.';
  END IF;

  v_final_billing_addr := COALESCE(p_billing_address, v_final_shipping_addr);

  -- 4. Cart items validation
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an order with an empty cart.';
  END IF;

  -- 5. Atomic Row-Locking, Inventory & Authoritative Pricing Verification
  -- Iterate through items to validate and acquire exclusive row lock on inventory
  FOR v_item_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_var_id := (v_item_elem->>'variant_id')::UUID;
    v_req_qty := (v_item_elem->>'quantity')::INT;

    IF v_var_id IS NULL THEN
      RAISE EXCEPTION 'Invalid cart item: missing variant_id.';
    END IF;

    IF v_req_qty IS NULL OR v_req_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity % for variant %: quantity must be positive.', v_req_qty, v_var_id;
    END IF;

    -- Concurrency Protection: Row lock on inventory row
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

    -- Fetch authoritative product, variant, and seller details
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

    -- Accumulate order-level aggregates
    v_subtotal := v_subtotal + v_line_total;
    v_total_weight := v_total_weight + v_line_weight;

    -- Append to validated list
    v_validated_item := jsonb_build_object(
      'seller_id', v_item_rec.seller_id,
      'product_id', v_item_rec.product_id,
      'variant_id', v_item_rec.variant_id,
      'product_name', v_item_rec.product_name,
      'sku', v_item_rec.sku,
      'size', v_item_rec.size,
      'colour', v_item_rec.colour,
      'unit_price', v_unit_price,
      'unit_weight_grams', v_unit_weight,
      'quantity', v_req_qty,
      'total_price', v_line_total,
      'commission_rate', v_comm_rate,
      'commission_amount', v_comm_amount,
      'seller_payout_amount', v_seller_payout
    );
    v_order_items_arr := v_order_items_arr || v_validated_item;
  END LOOP;

  -- 6. Authoritative Shipping & Grand Total Calculation
  v_shipping_amount := public.calculate_shipping(v_subtotal, v_total_weight);
  v_total_amount := v_subtotal + v_shipping_amount;

  -- 7. Generate Unique Order Number (Format: SENO-YYYYMMDD-XXXXXX)
  v_order_number := 'SENO-' || TO_CHAR(timezone('utc'::text, now()), 'YYYYMMDD') || '-' ||
                    LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- 8. Insert into public.orders
  INSERT INTO public.orders (
    order_number,
    customer_id,
    status,
    payment_status,
    payment_method,
    payment_reference,
    subtotal_amount,
    shipping_amount,
    discount_amount,
    total_amount,
    total_weight_grams,
    shipping_address,
    billing_address,
    notes
  ) VALUES (
    v_order_number,
    v_customer_id,
    'pending',
    'unpaid',
    'standard',
    p_idempotency_key,
    v_subtotal,
    v_shipping_amount,
    0.00,
    v_total_amount,
    v_total_weight,
    v_final_shipping_addr,
    v_final_billing_addr,
    p_notes
  )
  RETURNING id INTO v_order_id;

  -- 9. Insert Order Items & Decrement Inventory Atomically
  FOR v_item_elem IN SELECT * FROM jsonb_array_elements(v_order_items_arr)
  LOOP
    -- Insert snapshot item
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
      fulfillment_status
    ) VALUES (
      v_order_id,
      (v_item_elem->>'seller_id')::UUID,
      (v_item_elem->>'product_id')::UUID,
      (v_item_elem->>'variant_id')::UUID,
      v_item_elem->>'product_name',
      v_item_elem->>'sku',
      jsonb_build_object(
        'size', v_item_elem->>'size',
        'colour', v_item_elem->>'colour',
        'sku', v_item_elem->>'sku'
      ),
      (v_item_elem->>'unit_price')::NUMERIC,
      (v_item_elem->>'unit_weight_grams')::NUMERIC,
      (v_item_elem->>'quantity')::INT,
      (v_item_elem->>'total_price')::NUMERIC,
      (v_item_elem->>'commission_rate')::NUMERIC,
      (v_item_elem->>'commission_amount')::NUMERIC,
      (v_item_elem->>'seller_payout_amount')::NUMERIC,
      'unfulfilled'
    );

    -- Atomically decrement stock
    UPDATE public.inventory
    SET quantity = quantity - (v_item_elem->>'quantity')::INT,
        updated_at = timezone('utc'::text, now())
    WHERE variant_id = (v_item_elem->>'variant_id')::UUID;
  END LOOP;

  -- 10. Record Idempotency Key (if supplied)
  IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
    INSERT INTO public.order_idempotency_keys (idempotency_key, customer_id, order_id)
    VALUES (p_idempotency_key, v_customer_id, v_order_id)
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  -- 11. Return created order summary
  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'status', 'pending',
    'payment_status', 'unpaid',
    'subtotal_amount', v_subtotal,
    'shipping_amount', v_shipping_amount,
    'total_amount', v_total_amount,
    'total_weight_grams', v_total_weight
  );
END;
$$;
