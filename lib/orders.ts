'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidateStorefrontForOrder } from './storefront-revalidation'
import { notifyOrderPlaced } from '@/lib/notifications/service'

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

export interface FulfillmentEvent {
  id: string
  order_item_id: string
  status: string
  actor_type?: string | null
  note?: string | null
  carrier?: string | null
  tracking_number?: string | null
  estimated_delivery_date?: string | null
  created_at: string
}

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
  fulfillment_events?: FulfillmentEvent[]
  sellers?: {
    id?: string
    store_name?: string
    slug?: string
  } | null
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
  payment_status: 'unpaid' | 'authorized' | 'paid' | 'refund_processing' | 'failed' | 'refunded'
  payment_method?: string | null
  payment_reference?: string | null
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

    if (result.success && result.order_id) {
      await revalidateStorefrontForOrder(result.order_id, supabase)
      notifyOrderPlaced(result.order_id).catch(() => {})
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
        payment_reference,
        razorpay_order_id,
        razorpay_payment_id,
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
          tracking_number,
          carrier,
          estimated_delivery_date,
          created_at
        )
      `)
      .eq('customer_id', user.id)
      .or('payment_status.in.(paid,authorized,refunded,refund_processing),status.in.(confirmed,processing,partially_shipped,shipped,delivered)')
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
 * Supports canonical lookup by either database order UUID or public order_number.
 * Uses maybeSingle() to cleanly handle missing rows without PGRST116 coercion errors.
 */
export async function getCustomerOrderById(
  orderIdentifier: string
): Promise<{ order: Order | null; error?: string }> {
  try {
    const cleanIdentifier = (orderIdentifier || '').trim()
    if (!cleanIdentifier) {
      return { order: null, error: 'Order reference required.' }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { order: null, error: 'Authentication required.' }
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanIdentifier)

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        status,
        payment_status,
        payment_method,
        payment_reference,
        razorpay_order_id,
        razorpay_payment_id,
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
          tracking_number,
          carrier,
          estimated_delivery_date,
          created_at,
          fulfillment_events (
            id,
            order_item_id,
            status,
            actor_type,
            note,
            carrier,
            tracking_number,
            estimated_delivery_date,
            created_at
          )
        )
      `)
      .eq('customer_id', user.id)

    if (isUuid) {
      query = query.eq('id', cleanIdentifier)
    } else {
      query = query.eq('order_number', cleanIdentifier.replace(/^#/, ''))
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      return { order: null, error: error.message }
    }

    if (!data) {
      return { order: null, error: 'Order not found or unauthorized.' }
    }

    // Resolve sellers details from sellers_public for display
    const rawOrder = data as any
    if (rawOrder.order_items && rawOrder.order_items.length > 0) {
      const sellerIds = Array.from(new Set(rawOrder.order_items.map((i: any) => i.seller_id).filter(Boolean))) as string[]
      let sellerMap = new Map<string, { id?: string; store_name?: string; slug?: string }>()

      if (sellerIds.length > 0) {
        const { data: sellersData } = await supabase
          .from('sellers_public')
          .select('id, store_name, slug')
          .in('id', sellerIds)

        if (sellersData) {
          sellerMap = new Map(sellersData.map((s: any) => [s.id, s]))
        }
      }

      for (const item of rawOrder.order_items) {
        if (item.seller_id && sellerMap.has(item.seller_id)) {
          const s = sellerMap.get(item.seller_id)
          item.sellers = {
            id: s?.id,
            store_name: s?.store_name === 'SENO' ? 'SENO Official' : s?.store_name || 'SENO Official',
            slug: s?.slug || 'seno-official'
          }
        } else {
          item.sellers = { store_name: 'SENO Official', slug: 'seno-official' }
        }
      }
    }

    return { order: rawOrder as unknown as Order }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve order.'
    return { order: null, error: message }
  }
}
