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

    const { data, error } = await admin.rpc('create_system_notification', {
      p_user_id: params.userId,
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      p_data: payloadData,
      p_idempotency_key: params.idempotencyKey || null
    })

    if (error) {
      console.error('[NotificationService] RPC error:', error)
      return { success: false, error: error.message }
    }

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
      .select('id, order_number, customer_id, total_amount')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

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
export async function notifyPaymentFailed(orderId: string, errorMessage?: string) {
  try {
    const admin = getAdminClient()
    const { data: order } = await admin
      .from('orders')
      .select('id, order_number, customer_id, total_amount')
      .eq('id', orderId)
      .maybeSingle()

    if (!order) return

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
      idempotencyKey: `payment_failed_${order.id}_${Date.now()}`
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
            order_number: order.order_number
          }
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

    // Customer
    await createNotification({
      userId: order.customer_id,
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Order #${order.order_number} was cancelled${reason ? ` (${reason})` : ''}.`,
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
