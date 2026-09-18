'use server'

import { createClient } from '@/utils/supabase/server'

export interface OrderAddress {
  recipient_name: string
  phone: string
  address_line1: string
  address_line2?: string | null
  city: string
  state: string
  postal_code: string
  country: string
}

export type FulfillmentState =
  | 'unfulfilled'
  | 'processing'
  | 'dispatched'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned'
  | 'delivery_failed'

export interface OrderItem {
  id: string
  order_id: string
  seller_id: string
  product_id: string
  variant_id: string
  product_name: string
  sku: string
  variant_details: {
    size?: string
    colour?: string
    sku?: string
    [key: string]: unknown
  }
  unit_price: number
  unit_weight_grams: number
  quantity: number
  total_price: number
  fulfillment_status: FulfillmentState | 'shipped'
  tracking_number?: string | null
  carrier?: string | null
  estimated_delivery_date?: string | null
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  status:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'partially_shipped'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded'
  payment_status: 'unpaid' | 'authorized' | 'paid' | 'failed' | 'refunded'
  payment_method?: string | null
  subtotal_amount: number
  shipping_amount: number
  discount_amount: number
  total_amount: number
  total_weight_grams: number
  shipping_address: OrderAddress
  billing_address?: OrderAddress | null
  notes?: string | null
  razorpay_order_id?: string | null
  razorpay_payment_id?: string | null
  created_at: string
  order_items?: OrderItem[]
}


export interface CreateOrderInput {
  items: {
    variant_id: string
    quantity: number
  }[]
  address_id?: string
  shipping_address?: OrderAddress
  billing_address?: OrderAddress
  notes?: string
  idempotency_key?: string
}

export interface CreateOrderResult {
  success: boolean
  order_id?: string
  order_number?: string
  subtotal_amount?: number
  shipping_amount?: number
  total_amount?: number
  total_weight_grams?: number
  is_duplicate?: boolean
  error?: string
}

/**
 * Server action: authoritatively verifies and creates an order inside PostgreSQL.
 *
 * Security & Integrity:
 * - Enforces authenticated session server-side.
 * - Validates address ownership against public.addresses.
 * - Calls public.create_order RPC which executes row locks (SELECT ... FOR UPDATE)
 *   on inventory to guarantee atomic, concurrency-safe stock deduction and
 *   authoritative price/weight calculation.
 */
export async function placeOrderAction(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required. Please sign in to complete your checkout.'
      }
    }

    if (!input.items || input.items.length === 0) {
      return {
        success: false,
        error: 'Your cart is empty. Please add items before placing an order.'
      }
    }

    // Validate quantities
    for (const item of input.items) {
      if (!item.variant_id) {
        return { success: false, error: 'Invalid item: missing variant reference.' }
      }
      if (!item.quantity || item.quantity <= 0) {
        return { success: false, error: 'Item quantities must be at least 1.' }
      }
    }

    let verifiedShippingAddress: OrderAddress | null = null

    // 1. If saved address selected, verify it belongs strictly to this user
    if (input.address_id) {
      const { data: addrData, error: addrError } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', input.address_id)
        .eq('user_id', user.id)
        .single()

      if (addrError || !addrData) {
        return {
          success: false,
          error: 'The selected delivery address is invalid or does not belong to your account.'
        }
      }

      verifiedShippingAddress = {
        recipient_name: addrData.recipient_name,
        phone: addrData.phone,
        address_line1: addrData.address_line1,
        address_line2: addrData.address_line2 || null,
        city: addrData.city,
        state: addrData.state,
        postal_code: addrData.postal_code,
        country: addrData.country || 'India'
      }
    } else if (input.shipping_address) {
      // 2. Validate new manual address input server-side
      const addr = input.shipping_address
      if (
        !addr.recipient_name?.trim() ||
        !addr.phone?.trim() ||
        !addr.address_line1?.trim() ||
        !addr.city?.trim() ||
        !addr.state?.trim() ||
        !addr.postal_code?.trim()
      ) {
        return {
          success: false,
          error: 'Please fill in all required shipping address fields.'
        }
      }
      verifiedShippingAddress = {
        recipient_name: addr.recipient_name.trim(),
        phone: addr.phone.trim(),
        address_line1: addr.address_line1.trim(),
        address_line2: addr.address_line2?.trim() || null,
        city: addr.city.trim(),
        state: addr.state.trim(),
        postal_code: addr.postal_code.trim(),
        country: addr.country?.trim() || 'India'
      }
    } else {
      return {
        success: false,
        error: 'A delivery address is required to complete your order.'
      }
    }

    // 3. Call database-authoritative transactional RPC
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_order',
      {
        p_items: input.items,
        p_shipping_address: verifiedShippingAddress,
        p_billing_address: input.billing_address || verifiedShippingAddress,
        p_notes: input.notes || null,
        p_address_id: input.address_id || null,
        p_idempotency_key: input.idempotency_key || null
      }
    )

    if (rpcError) {
      // Return clear error message directly from database validation
      return {
        success: false,
        error: rpcError.message || 'Failed to place order. Please try again.'
      }
    }

    const result = rpcResult as {
      success: boolean
      order_id: string
      order_number: string
      subtotal_amount: number
      shipping_amount: number
      total_amount: number
      total_weight_grams: number
      is_duplicate: boolean
    }

    return {
      success: true,
      order_id: result.order_id,
      order_number: result.order_number,
      subtotal_amount: Number(result.subtotal_amount),
      shipping_amount: Number(result.shipping_amount),
      total_amount: Number(result.total_amount),
      total_weight_grams: Number(result.total_weight_grams),
      is_duplicate: result.is_duplicate
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred during checkout.'
    return { success: false, error: message }
  }
}

/**
 * Server action: fetches order history for the authenticated customer.
 * Enforced by Supabase Row Level Security (RLS).
 * Excludes private reseller commission and payout data.
 */
export async function getCustomerOrders(): Promise<{ orders: Order[]; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { orders: [], error: 'Authentication required.' }
    }

    // Customer-safe query: explicitly omits commission_rate, commission_amount, seller_payout_amount
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
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
        created_at,
        order_items (
          id,
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
          fulfillment_status,
          created_at
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return { orders: [], error: error.message }
    }

    return { orders: (data as unknown as Order[]) || [] }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve order history.'
    return { orders: [], error: message }
  }
}

/**
 * Server action: fetches a single order for the authenticated customer.
 */
export async function getCustomerOrderById(
  orderId: string
): Promise<{ order: Order | null; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { order: null, error: 'Authentication required.' }
    }

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
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
        created_at,
        order_items (
          id,
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
          fulfillment_status,
          created_at
        )
      `)
      .eq('id', orderId)
      .single()

    if (error) {
      return { order: null, error: error.message }
    }

    return { order: data as unknown as Order }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve order.'
    return { order: null, error: message }
  }
}
