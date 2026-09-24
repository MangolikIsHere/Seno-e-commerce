export type NotificationType =
  | 'order_placed'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'order_processing'
  | 'order_dispatched'
  | 'order_in_transit'
  | 'order_out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  | 'refund_initiated'
  | 'refund_completed'
  | 'seller_new_order'
  | 'seller_item_cancelled'
  | 'admin_new_order'
  | 'admin_payment_failed'
  | 'admin_refund_requested'

export interface NotificationRecord {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data: NotificationMetadata
  idempotency_key: string | null
  read_at: string | null
  created_at: string
}

export interface NotificationMetadata {
  order_id?: string
  order_number?: string
  order_item_id?: string
  product_name?: string
  amount?: number
  deep_link?: string
  tracking_number?: string
  carrier?: string
  reason?: string
  [key: string]: unknown
}

export interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: NotificationMetadata
  idempotencyKey?: string
}

export interface PushSubscriptionRecord {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent?: string | null
  created_at: string
}

export interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

export interface PushSubscriptionInput {
  endpoint: string
  keys: PushSubscriptionKeys
}

/**
 * Builds standard deep links based on notification type and metadata.
 */
export function buildNotificationDeepLink(type: NotificationType, data: Record<string, any>): string {
  if (data?.deep_link) return data.deep_link

  if (type.startsWith('seller_')) {
    if (data?.order_id) return `/seller/orders/${data.order_id}`
    return '/seller/orders'
  }

  if (type.startsWith('admin_')) {
    if (data?.order_id) return `/admin/orders/${data.order_id}`
    return '/admin/orders'
  }

  // Customer routes
  if (type === 'payment_failed') {
    return '/checkout'
  }

  if (type === 'order_dispatched' || type === 'order_in_transit' || type === 'order_out_for_delivery') {
    if (data?.order_id) return `/account/orders/${data.order_id}/track`
  }

  if (data?.order_id) {
    return `/account/orders/${data.order_id}`
  }

  return '/account'
}
