'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { CreateNotificationParams, NotificationRecord, NotificationType, buildNotificationDeepLink } from './types'
import { dispatchWebPushToUser } from './push'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for server-authoritative notification creation.')
  }
  return createSupabaseClient(url, key)
}

/**
 * Centralized, server-authoritative notification dispatcher.
 * Enforces idempotency to prevent duplicate notifications from webhooks / parallel threads.
 */
export async function createNotification(params: CreateNotificationParams): Promise<{
  success: boolean
  id?: string
  idempotent?: boolean
  error?: string
}> {
  try {
    const admin = getAdminClient()

    const deepLink = buildNotificationDeepLink(params.type, params.data || {})
    const payloadData = {
      ...(params.data || {}),
      deep_link: deepLink
    }

    let notifRes = await admin.rpc('create_system_notification', {
      p_user_id: params.userId,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_data: payloadData,
      p_idempotency_key: params.idempotencyKey || null
    })

    if (notifRes.error) {
      // If Postgres enum mismatch (22P02), fallback to valid base enum type while preserving original_type in payload
      if (notifRes.error.code === '22P02') {
        let fallbackType: NotificationType = 'order_placed'
        if (params.type.startsWith('seller_')) {
          fallbackType = 'seller_notice'
        } else if (params.type.startsWith('admin_')) {
          fallbackType = 'admin_new_order'
        } else if (params.type === 'order_returned') {
          fallbackType = 'order_cancelled'
        }

        const fallbackData = {
          ...payloadData,
          original_type: params.type
        }

        notifRes = await admin.rpc('create_system_notification', {
          p_user_id: params.userId,
          p_type: fallbackType,
          p_title: params.title,
          p_message: params.message,
          p_data: fallbackData,
          p_idempotency_key: params.idempotencyKey || null
        })
      }
    }

    if (notifRes.error) {
      console.error('[NotificationService] RPC error:', notifRes.error)
      return { success: false, error: notifRes.error.message }
    }

    const data = notifRes.data

    // Trigger Web Push in background if this is a newly created notification
    if (data?.success && !data?.idempotent) {
      dispatchWebPushToUser(params.userId, {
        title: params.title,
        body: params.message,
        url: deepLink,
        data: payloadData
      }).catch(err => {
        console.warn('[NotificationService] Web Push failed:', err)
      })
    }

    return {
      success: true,
      id: data?.id,
      idempotent: data?.idempotent || false
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unexpected notification creation error'
    console.error('[NotificationService] createNotification exception:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Fetches notifications for the currently authenticated user.
 * Strictly adheres to Supabase RLS.
 */
export async function getUserNotifications(limit = 20, offset = 0): Promise<{
  notifications: NotificationRecord[]
  unreadCount: number
}> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { notifications: [], unreadCount: 0 }
    }

    const [listRes, countRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)
    ])

    return {
      notifications: (listRes.data as NotificationRecord[]) || [],
      unreadCount: countRes.count || 0
    }
  } catch (err) {
    console.error('[NotificationService] getUserNotifications error:', err)
    return { notifications: [], unreadCount: 0 }
  }
}

/**
 * Returns unread notification count for the authenticated user.
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return 0
    }

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)

    return count || 0
  } catch {
    return 0
  }
}

/**
 * Marks specific notifications or all notifications as read for the authenticated user.
 */
export async function markNotificationsAsReadAction(
  notificationIds?: string[],
  markAll = false
): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentication required' }
    }

    const { data, error } = await supabase.rpc('mark_notifications_read', {
      p_notification_ids: notificationIds && notificationIds.length > 0 ? notificationIds : null,
      p_mark_all: markAll
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, updatedCount: data?.updated_count || 0 }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error marking notifications read'
    return { success: false, error: msg }
  }
}

// ==============================================================================
// AUTHORITATIVE DOMAIN EVENT NOTIFIERS
// ==============================================================================

/**
 * 1. Customer: Order Placed (Reservation Created)
 */
export async function notifyOrderPlaced(orderId: string) {
  try {
    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, order_number, customer_id, total_amount, status, payment_status')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

    // An unpaid pending checkout reservation must never trigger a customer-facing "Order Received" notification
    if (order.status === 'pending' && order.payment_status === 'unpaid') {
      return
    }

    await createNotification({
      userId: order.customer_id,
      type: 'order_placed',
      title: 'Order Received',
      message: `Your order #${order.order_number} for ₹${Number(order.total_amount).toLocaleString('en-IN')} has been placed.`,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        amount: Number(order.total_amount)
      },
      idempotencyKey: `order_placed_${order.id}`
    })
  } catch (err) {
    console.error('[NotificationService] notifyOrderPlaced failed:', err)
  }
}

/**
 * 2. Payment Confirmed:
 * Notifies customer, affected sellers, and platform admins.
 */
export async function notifyPaymentConfirmed(orderId: string) {
  try {
    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        total_amount,
        order_items (
          id,
          product_name,
          quantity,
          total_price,
          seller_id,
          sellers:seller_id (
            id,
            store_name,
            user_id
          )
        )
      `)
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

    // A. Notify Customer
    await createNotification({
      userId: order.customer_id,
      type: 'payment_confirmed',
      title: 'Payment Confirmed',
      message: `Payment confirmed for order #${order.order_number}. Our studio has begun preparing your items.`,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        amount: Number(order.total_amount)
      },
      idempotencyKey: `payment_confirmed_cust_${order.id}`
    })

    // B. Notify Sellers whose products are in this order
    const sellerMap = new Map<string, { userId: string; storeName: string; count: number }>()

    for (const item of (order.order_items as any[]) || []) {
      const seller = item.sellers
      if (seller && seller.user_id) {
        const existing = sellerMap.get(seller.id) || {
          userId: seller.user_id,
          storeName: seller.store_name,
          count: 0
        }
        existing.count += item.quantity
        sellerMap.set(seller.id, existing)
      }
    }

    for (const [sellerId, info] of sellerMap.entries()) {
      await createNotification({
        userId: info.userId,
        type: 'seller_new_order',
        title: 'New Paid Order Item',
        message: `Order #${order.order_number} has ${info.count} item(s) awaiting your fulfillment.`,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          seller_id: sellerId
        },
        idempotencyKey: `seller_new_order_${order.id}_${sellerId}`
      })
    }

    // C. Notify Admins
    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (adminProfiles) {
      for (const adm of adminProfiles) {
        await createNotification({
          userId: adm.id,
          type: 'admin_new_order',
          title: 'New Confirmed Order',
          message: `Order #${order.order_number} (₹${Number(order.total_amount).toLocaleString('en-IN')}) successfully verified and paid.`,
          data: {
            order_id: order.id,
            order_number: order.order_number,
            amount: Number(order.total_amount)
          },
          idempotencyKey: `admin_new_order_${order.id}_${adm.id}`
        })
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifyPaymentConfirmed failed:', err)
  }
}

/**
 * 3. Payment Failure:
 * Notifies customer of failure and provides a way to retry.
 */
export async function notifyPaymentFailed(orderId: string, errorMessage?: string, paymentId?: string) {
  try {
    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, order_number, customer_id, total_amount')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

    const safeAttemptKey = paymentId ? paymentId.replace(/[^a-zA-Z0-9_-]/g, '') : 'attempt'

    await createNotification({
      userId: order.customer_id,
      type: 'payment_failed',
      title: 'Payment Incomplete',
      message: errorMessage
        ? `Payment attempt for order #${order.order_number} could not be completed: ${errorMessage}`
        : `Payment attempt for order #${order.order_number} could not be completed. You may retry your checkout.`,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        deep_link: '/checkout'
      },
      idempotencyKey: `payment_failed_${order.id}_${safeAttemptKey}`
    })

    // Notify Admins of payment failure
    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (adminProfiles) {
      for (const adm of adminProfiles) {
        await createNotification({
          userId: adm.id,
          type: 'admin_payment_failed',
          title: 'Payment Failed',
          message: `Payment failed on order #${order.order_number}: ${errorMessage || 'Unknown error'}`,
          data: {
            order_id: order.id,
            order_number: order.order_number,
            deep_link: `/admin/orders/${order.id}`
          },
          idempotencyKey: `admin_payment_failed_${order.id}_${safeAttemptKey}_${adm.id}`
        })
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifyPaymentFailed failed:', err)
  }
}

/**
 * 4. Fulfillment State Change:
 * Maps order item status change to appropriate customer notification.
 */
export async function notifyOrderItemFulfillmentChanged(
  orderItemId: string,
  newStatus: string,
  trackingNumber?: string,
  carrier?: string
) {
  try {
    const admin = getAdminClient()
    const { data: item } = await admin
      .from('order_items')
      .select(`
        id,
        product_name,
        order_id,
        orders (
          id,
          order_number,
          customer_id
        )
      `)
      .eq('id', orderItemId)
      .maybeSingle()

    if (!item || !item.orders) return

    const order = item.orders as any
    const customerId = order.customer_id

    let notifType: NotificationType | null = null
    let title = ''
    let message = ''

    switch (newStatus) {
      case 'processing':
        notifType = 'order_processing'
        title = 'Order Processing'
        message = `"${item.product_name}" from order #${order.order_number} is being crafted and packaged.`
        break
      case 'dispatched':
        notifType = 'order_dispatched'
        title = 'Item Dispatched'
        message = carrier && trackingNumber
          ? `"${item.product_name}" has dispatched with ${carrier} (${trackingNumber}).`
          : `"${item.product_name}" from order #${order.order_number} has been dispatched.`
        break
      case 'in_transit':
        notifType = 'order_in_transit'
        title = 'Item in Transit'
        message = `"${item.product_name}" is on its way to your delivery address.`
        break
      case 'out_for_delivery':
        notifType = 'order_out_for_delivery'
        title = 'Out for Delivery'
        message = `"${item.product_name}" is out for delivery today.`
        break
      case 'delivered':
        notifType = 'order_delivered'
        title = 'Item Delivered'
        message = `"${item.product_name}" from order #${order.order_number} has been delivered. Enjoy your piece.`
        break
      case 'cancelled':
        notifType = 'order_cancelled'
        title = 'Item Cancelled'
        message = `"${item.product_name}" from order #${order.order_number} was cancelled.`
        break
      case 'returned':
        notifType = 'order_returned'
        title = 'Item Returned'
        message = `"${item.product_name}" from order #${order.order_number} has been recorded as returned.`
        break
      case 'delivery_failed':
        notifType = 'order_in_transit'
        title = 'Delivery Reattempt Required'
        message = `A delivery attempt for "${item.product_name}" (order #${order.order_number}) could not be completed. The courier will reattempt.`
        break
      default:
        break
    }

    if (!notifType) return

    await createNotification({
      userId: customerId,
      type: notifType,
      title,
      message,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        order_item_id: item.id,
        product_name: item.product_name,
        tracking_number: trackingNumber,
        carrier
      },
      idempotencyKey: `fulfillment_${orderItemId}_${newStatus}`
    })
  } catch (err) {
    console.error('[NotificationService] notifyOrderItemFulfillmentChanged failed:', err)
  }
}

/**
 * 5. Order Cancellation:
 * Notifies customer, affected sellers, and admin.
 */
export async function notifyOrderCancelled(orderId: string, reason?: string) {
  try {
    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        order_items (
          id,
          seller_id,
          sellers:seller_id (
            id,
            user_id
          )
        )
      `)
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

    // Helper to sanitize internal machine tokens into customer-friendly text
    const formatCancellationReason = (r?: string): string => {
      if (!r) return ''
      switch (r) {
        case 'checkout_dismissed_or_failed':
        case 'checkout_cancelled':
          return ''
        case 'reservation_expired':
          return ' (reservation expired)'
        case 'payment_failed':
          return ' (payment failed)'
        case 'customer_cancellation':
        case 'customer_cancelled':
          return ' (requested by customer)'
        case 'admin_cancelled':
          return ' (administrative cancellation)'
        case 'seller_cancelled':
          return ' (item unavailable)'
        case 'out_of_stock':
          return ' (out of stock)'
        default: {
          const sanitized = r.replace(/_/g, ' ').trim()
          return sanitized ? ` (${sanitized})` : ''
        }
      }
    }

    // Customer
    await createNotification({
      userId: order.customer_id,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Order #${order.order_number} was cancelled${formatCancellationReason(reason)}.`,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        reason
      },
      idempotencyKey: `order_cancelled_${order.id}`
    })

    // Sellers
    const notifiedSellers = new Set<string>()
    for (const item of (order.order_items as any[]) || []) {
      const seller = item.sellers
      if (seller && seller.user_id && !notifiedSellers.has(seller.id)) {
        notifiedSellers.add(seller.id)
        await createNotification({
          userId: seller.user_id,
          type: 'seller_item_cancelled',
          title: 'Order Cancelled',
          message: `Order #${order.order_number} was cancelled.`,
          data: {
            order_id: order.id,
            order_number: order.order_number,
            reason
          },
          idempotencyKey: `seller_order_cancelled_${order.id}_${seller.id}`
        })
      }
    }

    // Admins
    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (adminProfiles) {
      for (const adm of adminProfiles) {
        await createNotification({
          userId: adm.id,
          type: 'order_cancelled',
          title: 'Order Cancelled',
          message: `Order #${order.order_number} was cancelled${formatCancellationReason(reason)}.`,
          data: {
            order_id: order.id,
            order_number: order.order_number,
            reason,
            deep_link: `/admin/orders/${order.id}`
          },
          idempotencyKey: `admin_order_cancelled_${order.id}_${adm.id}`
        })
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifyOrderCancelled failed:', err)
  }
}

/**
 * 6. Refund Events:
 * Notifies customer and admin.
 */
export async function notifyRefundEvent(orderId: string, type: 'refund_initiated' | 'refund_completed', amount: number, orderItemId?: string) {
  try {
    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, order_number, customer_id')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

    const isInitiated = type === 'refund_initiated'
    const title = isInitiated ? 'Refund Initiated' : 'Refund Completed'
    const message = isInitiated
      ? `A refund of ₹${amount.toLocaleString('en-IN')} has been initiated for order #${order.order_number}. It will reflect in 5-7 business days.`
      : `Your refund of ₹${amount.toLocaleString('en-IN')} for order #${order.order_number} has been processed successfully.`

    await createNotification({
      userId: order.customer_id,
      type,
      title,
      message,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        order_item_id: orderItemId,
        amount
      },
      idempotencyKey: `${type}_${order.id}_${orderItemId || 'full'}`
    })

    // Admin notification on refund requested
    if (isInitiated) {
      const { data: adminProfiles } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (adminProfiles) {
        for (const adm of adminProfiles) {
          await createNotification({
            userId: adm.id,
            type: 'admin_refund_requested',
            title: 'Refund Request',
            message: `Refund of ₹${amount.toLocaleString('en-IN')} initiated on order #${order.order_number}.`,
            data: {
              order_id: order.id,
              order_number: order.order_number,
              amount
            }
          })
        }
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifyRefundEvent failed:', err)
  }
}

/**
 * 7. Seller Product Decision (Approval, Rejection, Needs Revision, Suspended):
 * Notifies the product owner with actionable guidance.
 */
export async function notifySellerProductDecision(
  productId: string,
  action: 'approved' | 'rejected' | 'suspended' | 'draft',
  reason?: string
) {
  try {
    const admin = getAdminClient()
    const { data: product } = await admin
      .from('products')
      .select('id, name, seller_id, sellers(id, user_id, store_name)')
      .eq('id', productId)
      .maybeSingle()

    if (!product) return
    const seller = (product as any).sellers
    if (!seller || !seller.user_id) return

    let notifType: NotificationType = 'seller_product_approved'
    let title = 'Product Approved'
    let message = `"${product.name}" has been approved by SENO Admin and is now active.`

    if (action === 'rejected') {
      notifType = 'seller_product_rejected'
      title = 'Product Requires Changes'
      message = `"${product.name}" requires adjustments before it can be listed: ${reason || 'Please check guidelines and resubmit.'}`
    } else if (action === 'suspended') {
      notifType = 'seller_product_suspended'
      title = 'Product Suspended'
      message = `"${product.name}" has been suspended from the catalog: ${reason || 'Contact SENO admin for details.'}`
    } else if (action === 'draft') {
      notifType = 'seller_notice'
      title = 'Product Moved to Draft'
      message = `"${product.name}" has been placed in draft status${reason ? `: ${reason}` : '.'}`
    }

    await createNotification({
      userId: seller.user_id,
      type: notifType,
      title,
      message,
      data: {
        product_id: product.id,
        product_name: product.name,
        action,
        reason,
        deep_link: action === 'rejected' ? `/seller/products/${product.id}/revisions` : '/seller/products'
      },
      idempotencyKey: `seller_prod_${productId}_${action}`
    })
  } catch (err) {
    console.error('[NotificationService] notifySellerProductDecision failed:', err)
  }
}

/**
 * 8. Seller Commission Update:
 * Notifies seller of authoritative rate adjustment and effective time.
 */
export async function notifySellerCommissionChanged(
  sellerId: string,
  newRate: number,
  previousRate?: number
) {
  try {
    const admin = getAdminClient()
    const { data: seller } = await admin
      .from('sellers')
      .select('id, user_id, store_name, commission_rate')
      .eq('id', sellerId)
      .maybeSingle()

    if (!seller || !seller.user_id) return

    const nowIso = new Date().toISOString()
    const message = previousRate !== undefined && previousRate !== newRate
      ? `Your platform commission rate is now ${newRate}% (previously ${previousRate}%). This applies to all new orders.`
      : `Your platform commission rate has been set to ${newRate}%. This applies to all new orders.`

    await createNotification({
      userId: seller.user_id,
      type: 'seller_commission_updated',
      title: 'Commission Rate Updated',
      message,
      data: {
        seller_id: sellerId,
        new_rate: newRate,
        previous_rate: previousRate,
        effective_at: nowIso,
        deep_link: '/seller/earnings'
      },
      idempotencyKey: `seller_comm_${sellerId}_${newRate}`
    })
  } catch (err) {
    console.error('[NotificationService] notifySellerCommissionChanged failed:', err)
  }
}

/**
 * 9. Seller Account Status Changed:
 * Notifies seller when account is approved, suspended, or rejected.
 */
export async function notifySellerAccountStatusChanged(
  sellerId: string,
  newStatus: string,
  reason?: string
) {
  try {
    const admin = getAdminClient()
    const { data: seller } = await admin
      .from('sellers')
      .select('id, user_id, store_name')
      .eq('id', sellerId)
      .maybeSingle()

    if (!seller || !seller.user_id) return

    let notifType: NotificationType = 'seller_account_approved'
    let title = 'Seller Account Approved'
    let message = `Congratulations! Your store "${seller.store_name}" is approved on SENO.`
    let deepLink = '/seller/dashboard'

    if (newStatus === 'suspended') {
      notifType = 'seller_account_suspended'
      title = 'Store Suspended'
      message = `Your seller account "${seller.store_name}" has been suspended: ${reason || 'Please contact SENO partner support.'}`
      deepLink = '/seller/help'
    } else if (newStatus === 'rejected') {
      notifType = 'seller_account_rejected'
      title = 'Application Decision'
      message = `Your application for "${seller.store_name}" was not approved at this time: ${reason || 'Please review requirements.'}`
      deepLink = '/seller/register'
    } else if (newStatus === 'commission_proposed') {
      notifType = 'seller_notice'
      title = 'Commission Proposal Received'
      message = `SENO has sent you a commission proposal for "${seller.store_name}". Please review and confirm.`
      deepLink = '/seller/dashboard'
    }

    await createNotification({
      userId: seller.user_id,
      type: notifType,
      title,
      message,
      data: {
        seller_id: sellerId,
        status: newStatus,
        reason,
        deep_link: deepLink
      },
      idempotencyKey: `seller_status_${sellerId}_${newStatus}`
    })
  } catch (err) {
    console.error('[NotificationService] notifySellerAccountStatusChanged failed:', err)
  }
}

/**
 * 10. Seller Refund Notification:
 * Notifies affected sellers when an administrator or payment gateway issues a refund.
 */
export async function notifySellerRefund(orderId: string, amount: number, orderItemId?: string) {
  try {
    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select(`
        id,
        order_number,
        order_items (
          id,
          seller_id,
          product_name,
          seller_payout_amount,
          sellers:seller_id (
            id,
            user_id
          )
        )
      `)
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

    const notifiedSellers = new Set<string>()
    for (const item of (order.order_items as any[]) || []) {
      if (orderItemId && item.id !== orderItemId) continue
      const seller = item.sellers
      if (seller && seller.user_id && !notifiedSellers.has(seller.id)) {
        notifiedSellers.add(seller.id)
        await createNotification({
          userId: seller.user_id,
          type: 'refund_completed',
          title: 'Order Refunded',
          message: `Order #${order.order_number} (${item.product_name || 'items'}) was refunded (₹${amount.toLocaleString('en-IN')}).`,
          data: {
            order_id: order.id,
            order_number: order.order_number,
            order_item_id: item.id,
            amount,
            deep_link: '/seller/orders'
          },
          idempotencyKey: `seller_refund_${order.id}_${seller.id}_${item.id || 'all'}`
        })
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifySellerRefund failed:', err)
  }
}

/**
 * 11. Low Stock & Inventory Shortage Alert:
 * Authoritatively notifies seller and platform admins when stock drops to or below threshold.
 */
export async function notifyLowStockAlert(
  variantId: string,
  remainingQuantity: number
) {
  try {
    const admin = getAdminClient()
    const { data: variant } = await admin
      .from('product_variants')
      .select(`
        id,
        title,
        sku,
        product_id,
        products (
          id,
          name,
          seller_id,
          sellers:seller_id (
            id,
            user_id,
            store_name
          )
        )
      `)
      .eq('id', variantId)
      .maybeSingle()

    if (!variant || !variant.products) return

    const product = variant.products as any
    const seller = product.sellers
    const titleText = remainingQuantity <= 0 ? 'Out of Stock Alert' : 'Low Stock Warning'
    const message = remainingQuantity <= 0
      ? `"${product.name}" (${variant.title || variant.sku || 'Variant'}) is now out of stock.`
      : `"${product.name}" (${variant.title || variant.sku || 'Variant'}) is running low (${remainingQuantity} unit${remainingQuantity === 1 ? '' : 's'} remaining).`

    // Notify Seller
    if (seller?.user_id) {
      await createNotification({
        userId: seller.user_id,
        type: 'seller_low_stock',
        title: titleText,
        message,
        data: {
          product_id: product.id,
          variant_id: variant.id,
          remaining_quantity: remainingQuantity,
          deep_link: '/seller/products'
        },
        idempotencyKey: `seller_low_stock_${variantId}_${remainingQuantity}`
      })
    }

    // Notify Admins
    const { data: adminProfiles } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (adminProfiles) {
      for (const adm of adminProfiles) {
        await createNotification({
          userId: adm.id,
          type: 'admin_low_stock',
          title: `Inventory: ${titleText}`,
          message: `${seller?.store_name || 'Platform'}: ${message}`,
          data: {
            product_id: product.id,
            variant_id: variant.id,
            remaining_quantity: remainingQuantity,
            deep_link: '/admin/products'
          },
          idempotencyKey: `admin_low_stock_${variantId}_${remainingQuantity}_${adm.id}`
        })
      }
    }
  } catch (err) {
    console.error('[NotificationService] notifyLowStockAlert failed:', err)
  }
}
