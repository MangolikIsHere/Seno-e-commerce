import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { notifyPaymentConfirmed, notifyPaymentFailed, notifyRefundEvent } from '@/lib/notifications/service'

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. Webhook cannot bypass RLS.')
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const eventIdHeader = req.headers.get('x-razorpay-event-id')

    if (!signature) {
      return NextResponse.json({ error: 'Missing x-razorpay-signature header' }, { status: 400 })
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET is not configured.')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // 1. Cryptographic Webhook Authenticity Verification
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    const event = JSON.parse(rawBody)
    const eventId = eventIdHeader || event.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const eventType = event.event as string
    const payload = event.payload || {}

    const supabase = getAdminSupabase()

    // 2. Check Idempotency via payment_events audit table
    const { data: existingEvent } = await supabase
      .from('payment_events')
      .select('id, processing_status')
      .eq('event_id', eventId)
      .maybeSingle()

    if (existingEvent && existingEvent.processing_status === 'processed') {
      return NextResponse.json({ message: 'Event already processed', idempotent: true }, { status: 200 })
    }

    // Extract Gateway References
    const paymentEntity = payload.payment?.entity || {}
    const orderEntity = payload.order?.entity || {}
    const refundEntity = payload.refund?.entity || {}

    const razorpayOrderId = paymentEntity.order_id || orderEntity.id || null
    const razorpayPaymentId = paymentEntity.id || null

    // Locate Corresponding SENO Order
    let senoOrderId: string | null = null

    if (paymentEntity.notes?.seno_order_id) {
      senoOrderId = paymentEntity.notes.seno_order_id
    } else if (orderEntity.notes?.seno_order_id) {
      senoOrderId = orderEntity.notes.seno_order_id
    } else if (razorpayOrderId) {
      const { data: matchedOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('razorpay_order_id', razorpayOrderId)
        .maybeSingle()

      if (matchedOrder) {
        senoOrderId = matchedOrder.id
      }
    }

    // Insert pending audit record
    await supabase.from('payment_events').upsert({
      event_id: eventId,
      order_id: senoOrderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      event_type: eventType,
      payload: event,
      processing_status: 'pending'
    }, { onConflict: 'event_id' })

    // 3. Process Event by Type
    if (eventType === 'order.paid' || eventType === 'payment.captured') {
      if (senoOrderId) {
        const paidAmount = paymentEntity.amount ? Number(paymentEntity.amount) / 100 : null
        await supabase.rpc('confirm_order_payment', {
          p_order_id: senoOrderId,
          p_razorpay_order_id: razorpayOrderId,
          p_razorpay_payment_id: razorpayPaymentId,
          p_paid_amount: paidAmount
        })
        notifyPaymentConfirmed(senoOrderId).catch(() => {})
      }
    } else if (eventType === 'payment.failed') {
      // CRITICAL: A failed payment MUST NOT cancel the order or release inventory reservation.
      // Customer is permitted to retry.
      if (senoOrderId) {
        const errDesc = paymentEntity.error_description || 'Payment failed at gateway.'
        await supabase.rpc('record_payment_failure', {
          p_order_id: senoOrderId,
          p_razorpay_order_id: razorpayOrderId,
          p_razorpay_payment_id: razorpayPaymentId,
          p_error_message: errDesc
        })
        notifyPaymentFailed(senoOrderId, errDesc).catch(() => {})
      }
    } else if (eventType === 'refund.created' || eventType === 'refund.processed') {
      const refundReceipt = refundEntity.receipt || ''
      const refundId = refundEntity.id || `rfnd_${Date.now()}`
      const isProcessed = eventType === 'refund.processed'

      if (refundReceipt) {
        // This is a partial item refund initiated by cancelAndRefundOrderItemAction
        // The receipt is the payment_events UUID
        await supabase.rpc('update_refund_status', {
          p_refund_event_id: refundReceipt,
          p_status: isProcessed ? 'processed' : 'pending',
          p_razorpay_refund_id: refundId
        })
        if (senoOrderId) {
          const refundAmount = refundEntity.amount ? Number(refundEntity.amount) / 100 : 0
          notifyRefundEvent(senoOrderId, isProcessed ? 'refund_completed' : 'refund_initiated', refundAmount).catch(() => {})
        }
      } else if (senoOrderId) {
        // Fallback for full order manual refunds
        const refundAmount = refundEntity.amount ? Number(refundEntity.amount) / 100 : 0
        await supabase.rpc('record_order_refund', {
          p_order_id: senoOrderId,
          p_razorpay_payment_id: razorpayPaymentId,
          p_refund_id: refundId,
          p_refund_amount: refundAmount
        })
        notifyRefundEvent(senoOrderId, isProcessed ? 'refund_completed' : 'refund_initiated', refundAmount).catch(() => {})
      }
    }
    await supabase
      .from('payment_events')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('event_id', eventId)

    // Invalidate caches so seller, customer, and admin immediately reflect confirmed state
    revalidatePath('/seller/orders')
    revalidatePath('/seller/dashboard')
    revalidatePath('/admin/orders')
    revalidatePath('/account')

    // Opportunistic expiration of any old unpaid reservations
    supabase.rpc('expire_unpaid_orders', { p_batch_size: 20 }).then(() => {}, () => {})

    return NextResponse.json({ success: true, processed: true }, { status: 200 })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal webhook processing error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
