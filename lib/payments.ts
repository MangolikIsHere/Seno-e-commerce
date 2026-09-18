'use server'

import crypto from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PaymentConfig {
  keyId: string
  currency: string
}

export interface RazorpayOrderResult {
  success: boolean
  razorpay_order_id?: string
  amount?: number
  currency?: string
  order_id?: string
  order_number?: string
  is_existing?: boolean
  already_paid?: boolean
  error?: string
}

export interface VerifyPaymentInput {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

export interface VerifyPaymentResult {
  success: boolean
  order_id?: string
  order_number?: string
  status?: string
  payment_status?: string
  is_already_paid?: boolean
  error?: string
}

/**
 * Returns safe public payment configuration for browser Razorpay modal.
 * Secrets remain strictly server-side.
 */
export async function getPaymentConfigAction(): Promise<PaymentConfig> {
  return {
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_seno_demo_key',
    currency: 'INR'
  }
}

/**
 * Concurrency-Safe Razorpay Order Creation / Retrieval
 * 
 * Rules:
 * 1. Server-authoritative: uses database total_amount (converted to paise).
 * 2. Concurrency-safe: if razorpay_order_id already exists on the SENO order, reuses it.
 * 3. If multiple simultaneous requests occur, DB row lock via attach_razorpay_order_id
 *    guarantees single winning association without duplicates.
 * 4. Payment retries reuse the existing unpaid SENO order and associated Razorpay order.
 */
export async function createRazorpayOrderAction(orderId: string): Promise<RazorpayOrderResult> {
  try {
    const supabase = await createClient()

    // Opportunistic cleanup of expired reservations
    supabase.rpc('expire_unpaid_orders', { p_batch_size: 20 }).then(() => {}, () => {})

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required.' }
    }

    // 1. Authoritative lookup of SENO order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, status, payment_status, total_amount, razorpay_order_id, expires_at')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Order not found.' }
    }

    // Customer ownership verification
    if (order.customer_id !== user.id) {
      return { success: false, error: 'Unauthorized access to this order.' }
    }

    if (order.status === 'cancelled') {
      return { success: false, error: 'This order has been cancelled and cannot be paid.' }
    }

    if (order.payment_status === 'paid') {
      return {
        success: true,
        already_paid: true,
        order_id: order.id,
        order_number: order.order_number,
        razorpay_order_id: order.razorpay_order_id || undefined
      }
    }

    // Expiration check
    if (order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
      return { success: false, error: 'This order reservation has expired. Please place a new order.' }
    }

    const authoritativeAmountPaise = Math.round(Number(order.total_amount) * 100)

    // 2. Concurrency-safe reuse: If already assigned, reuse existing Razorpay Order ID immediately
    if (order.razorpay_order_id && order.razorpay_order_id.trim() !== '') {
      return {
        success: true,
        is_existing: true,
        razorpay_order_id: order.razorpay_order_id,
        amount: authoritativeAmountPaise,
        currency: 'INR',
        order_id: order.id,
        order_number: order.order_number
      }
    }

    // 3. Create Razorpay order via REST API or test simulator
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_seno_demo_key'
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'seno_demo_secret_key_12345'

    let generatedRazorpayOrderId = ''

    // If real credentials available and not dummy prefix, call Razorpay API
    const isMock = keyId.startsWith('rzp_test_seno_demo') || keySecret.startsWith('seno_demo')

    if (!isMock) {
      const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: authoritativeAmountPaise,
          currency: 'INR',
          receipt: order.order_number,
          notes: {
            seno_order_id: order.id,
            customer_id: user.id
          }
        })
      })

      if (!rzpResponse.ok) {
        const errText = await rzpResponse.text()
        return { success: false, error: `Payment gateway order creation failed: ${errText}` }
      }

      const rzpData = await rzpResponse.json()
      generatedRazorpayOrderId = rzpData.id
    } else {
      // Test simulator order ID
      generatedRazorpayOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    }

    // 4. Atomically attach Razorpay Order ID using DB row-locking RPC
    // If a concurrent call raced and already attached a Razorpay Order ID, RPC returns the existing one!
    const { data: attachRes, error: attachError } = await supabase.rpc('attach_razorpay_order_id', {
      p_order_id: order.id,
      p_razorpay_order_id: generatedRazorpayOrderId
    })

    if (attachError || !attachRes || !attachRes.success) {
      return {
        success: false,
        error: attachRes?.error || attachError?.message || 'Failed to link payment gateway order.'
      }
    }

    const finalRzpOrderId = attachRes.razorpay_order_id || generatedRazorpayOrderId

    return {
      success: true,
      is_existing: attachRes.is_existing || false,
      razorpay_order_id: finalRzpOrderId,
      amount: authoritativeAmountPaise,
      currency: 'INR',
      order_id: order.id,
      order_number: order.order_number
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected payment initiation error.'
    return { success: false, error: msg }
  }
}

/**
 * Server-Authoritative Cryptographic Signature & Payment Verification
 * 
 * Rules:
 * 1. Browser confirmation is never trusted alone.
 * 2. Cryptographically verifies HMAC SHA256 signature against RAZORPAY_KEY_SECRET.
 * 3. Verifies customer owns the SENO order.
 * 4. Verifies order is in a valid payable state.
 * 5. Verifies razorpay_order_id matches the associated order.
 * 6. Invokes public.confirm_order_payment RPC (atomic & idempotent, does not re-decrement stock).
 */
export async function verifyPaymentAction(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  try {
    const supabase = await createClient()

    // Opportunistic cleanup
    supabase.rpc('expire_unpaid_orders', { p_batch_size: 20 }).then(() => {}, () => {})

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required.' }
    }

    if (!input.orderId || !input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
      return { success: false, error: 'Incomplete payment verification payload.' }
    }

    // 1. Authoritative lookup
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_id, status, payment_status, total_amount, razorpay_order_id')
      .eq('id', input.orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Order not found.' }
    }

    // Customer isolation
    if (order.customer_id !== user.id) {
      return { success: false, error: 'Unauthorized: Order belongs to another account.' }
    }

    // Idempotency: If already paid, return confirmed immediately
    if (order.payment_status === 'paid') {
      return {
        success: true,
        is_already_paid: true,
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: 'paid'
      }
    }

    if (order.status === 'cancelled') {
      return { success: false, error: 'Cannot confirm payment on a cancelled order.' }
    }

    // 2. Validate Razorpay Order ID association
    if (order.razorpay_order_id && order.razorpay_order_id !== input.razorpayOrderId) {
      return { success: false, error: 'Gateway order mismatch detected.' }
    }

    // 3. Cryptographic Signature Verification
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'seno_demo_secret_key_12345'
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
      .digest('hex')

    if (expectedSignature !== input.razorpaySignature) {
      // Record failure without releasing inventory (reservation remains valid for retry)
      await supabase.rpc('record_payment_failure', {
        p_order_id: order.id,
        p_razorpay_order_id: input.razorpayOrderId,
        p_razorpay_payment_id: input.razorpayPaymentId,
        p_error_message: 'Cryptographic signature mismatch.'
      })

      return { success: false, error: 'Invalid payment signature. Verification failed.' }
    }

    // 4. Atomically confirm order payment via database RPC
    const { data: confirmRes, error: confirmError } = await supabase.rpc('confirm_order_payment', {
      p_order_id: order.id,
      p_razorpay_order_id: input.razorpayOrderId,
      p_razorpay_payment_id: input.razorpayPaymentId,
      p_paid_amount: order.total_amount
    })

    if (confirmError || !confirmRes || !confirmRes.success) {
      return {
        success: false,
        error: confirmRes?.error || confirmError?.message || 'Failed to update order payment state.'
      }
    }

    // Invalidate caches across seller, customer, and admin portals
    revalidatePath('/seller/orders')
    revalidatePath('/seller/dashboard')
    revalidatePath('/admin/orders')
    revalidatePath('/account')

    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      status: 'confirmed',
      payment_status: 'paid',
      is_already_paid: confirmRes.is_already_paid || false
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Payment verification error.'
    return { success: false, error: msg }
  }
}

/**
 * Explicit Customer Cancellation of Unpaid Order
 * Atomically restores reserved inventory.
 */
export async function cancelUnpaidOrderAction(orderId: string, reason?: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required.' }
    }

    const { data, error } = await supabase.rpc('cancel_unpaid_order', {
      p_order_id: orderId,
      p_reason: reason || 'customer_cancelled'
    })

    if (error || !data || !data.success) {
      return { success: false, error: data?.error || error?.message || 'Unable to cancel order.' }
    }

    // Invalidate caches across seller, customer, and admin portals
    revalidatePath('/seller/orders')
    revalidatePath('/seller/dashboard')
    revalidatePath('/admin/orders')
    revalidatePath('/account')

    return {
      success: true,
      order_id: orderId,
      is_already_cancelled: data.is_already_cancelled,
      restored_items_count: data.restored_items_count
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Cancellation error.'
    return { success: false, error: msg }
  }
}

/**
 * Records a payment attempt failure without releasing inventory.
 */
export async function recordPaymentFailureAction(
  orderId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  errorMessage: string
) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('record_payment_failure', {
      p_order_id: orderId,
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
      p_error_message: errorMessage
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, ...data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error recording payment failure.'
    return { success: false, error: msg }
  }
}
