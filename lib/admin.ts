'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '@/lib/supabaseAdmin'
import { 
  notifyOrderItemFulfillmentChanged, 
  notifyRefundEvent,
  notifyOrderCancelled,
  notifySellerProductDecision,
  notifySellerCommissionChanged,
  notifySellerAccountStatusChanged,
  notifySellerRefund
} from '@/lib/notifications/service'
import { 
  serializeRevisionFeedback, 
  parseRevisionFeedback, 
  appendRevisionHistory, 
  AffectedFieldKey 
} from '@/lib/revisionFeedback'

export async function checkIsAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (
      data?.role === 'admin' ||
      user.email === 'admin@seno-luxury.com' ||
      user.email === 'admin.seno@gmail.com' ||
      user.email === 'debnathmangolik@gmail.com' ||
      user.email === 'officialsenostore@gmail.com'
    ) {
      return true
    }
  }

  // Allow developer access in local development mode for workflow verification
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  return false
}

export async function getAdminStoreSettings() {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) return null

  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching store settings:', error)
  }

  return data
}

export async function cancelAdminOrderAction(formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized: Admin access required.')
  const supabase = getAdminSupabase()

  const orderId = String(formData.get('orderId') || '')
  if (!orderId) throw new Error('Order ID is required.')

  // Fetch the order to check its payment status
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, payment_status, status')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found.')
  }

  // Strict Payment State Safety
  // If payment_status is paid, we do NOT release inventory (it is permanently consumed unless refunded)
  if (order.payment_status === 'paid') {
    throw new Error('Paid orders cannot be cancelled using this mechanism. Use the refund lifecycle instead.')
  }

  // If already cancelled, do nothing (idempotency)
  if (order.status === 'cancelled') {
    return
  }

  // Active Unpaid Reservation -> Use the atomic release mechanism
  const { data, error } = await supabase.rpc('cancel_unpaid_order', {
    p_order_id: orderId,
    p_reason: 'admin_cancelled'
  })

  if (error) {
    console.error('Error releasing unpaid reservation:', error)
    throw new Error('Failed to cancel the order and release inventory.')
  }

  notifyOrderCancelled(orderId, 'admin_cancelled').catch(() => {})

  // Revalidate caches so inventory updates show immediately on storefront
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/seller/dashboard')
  revalidatePath('/seller/products')
  revalidatePath('/seller/orders')
  revalidatePath('/') // catalog home
}

export async function refundAdminOrderAction(formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized: Admin access required.')
  const supabase = getAdminSupabase()

  const orderId = String(formData.get('orderId') || '')
  if (!orderId) throw new Error('Order ID is required.')

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, payment_status, total_amount, razorpay_payment_id, status, notes')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found.')
  }

  if (order.payment_status === 'refunded') {
    return { success: true, already_refunded: true }
  }

  if (order.payment_status !== 'paid') {
    throw new Error('Only paid orders can be refunded.')
  }

  const refundAmount = Number(order.total_amount || 0)
  let refundId = `rfnd_adm_${Date.now()}`

  // 1. Real-time Razorpay Gateway Refund API Call
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  const isMock = !keyId || !keySecret || keyId.startsWith('rzp_test_seno_demo') || keySecret.startsWith('seno_demo')

  if (!isMock && order.razorpay_payment_id && order.razorpay_payment_id !== 'mock_payment_id') {
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    try {
      const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${order.razorpay_payment_id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(refundAmount * 100),
          notes: {
            order_id: orderId,
            action: 'admin_full_refund'
          }
        })
      })

      if (rzpResponse.ok) {
        const rzpData = await rzpResponse.json()
        refundId = rzpData.id || refundId
      } else {
        const errText = await rzpResponse.text()
        console.error('Razorpay refund API rejected:', errText)
        throw new Error(`Razorpay refund API error: ${errText}`)
      }
    } catch (err: any) {
      console.error('Razorpay request failed:', err)
      throw new Error(`Razorpay gateway error: ${err.message}`)
    }
  }

  // 2. Call the database function record_order_refund
  const { error: rpcError } = await supabase.rpc('record_order_refund', {
    p_order_id: orderId,
    p_razorpay_payment_id: order.razorpay_payment_id || 'manual_settlement',
    p_refund_id: refundId,
    p_refund_amount: refundAmount
  })

  if (rpcError) {
    console.warn('RPC record_order_refund fallback to direct update:', rpcError.message)
    await supabase
      .from('orders')
      .update({
        payment_status: 'refunded',
        status: ['confirmed', 'pending', 'processing'].includes(order.status) ? 'refunded' : order.status,
        notes: (order.notes ? order.notes + '\n' : '') + `Admin refund processed via Razorpay: ${refundId} (₹${refundAmount})`
      })
      .eq('id', orderId)
  }

  notifyRefundEvent(orderId, 'refund_completed', refundAmount).catch(() => {})
  notifySellerRefund(orderId, refundAmount).catch(() => {})

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/payments')
  revalidatePath('/account')
  revalidatePath(`/account/orders/${orderId}`)
  return { success: true }
}

export async function getPendingSellers() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_type', 'reseller')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function updateSellerStatus(sellerId: string, status: string, commissionRate?: number) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  // Fetch previous state for notification context
  const { data: previousSeller } = await supabase
    .from('sellers')
    .select('commission_rate, seller_status')
    .eq('id', sellerId)
    .maybeSingle()

  const updates: any = { seller_status: status }
  if (commissionRate !== undefined) {
    updates.commission_rate = commissionRate
  }

  const { error } = await supabase
    .from('sellers')
    .update(updates)
    .eq('id', sellerId)

  if (error) throw new Error(error.message)

  if (status === 'approved') {
    const { data: seller } = await supabase.from('sellers').select('user_id').eq('id', sellerId).single()
    if (seller) {
      await supabase.from('profiles').update({ role: 'reseller' }).eq('id', seller.user_id)
    }
  }

  // Authoritative Notifications to Seller
  if (previousSeller && previousSeller.seller_status !== status) {
    notifySellerAccountStatusChanged(sellerId, status).catch(() => {})
  }
  if (commissionRate !== undefined && previousSeller && Number(previousSeller.commission_rate) !== Number(commissionRate)) {
    notifySellerCommissionChanged(sellerId, commissionRate, Number(previousSeller.commission_rate)).catch(() => {})
  }

  revalidatePath('/admin/sellers')
  revalidatePath('/seller/dashboard')
  revalidatePath('/seller/earnings')
}

// -------------------------------------------------------------
// COMMISSION NEGOTIATION (ADMIN)
// -------------------------------------------------------------

export async function getSellerWithProposals(sellerId: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  if (!sellerId || typeof sellerId !== 'string') {
    return { seller: null, proposals: [] }
  }

  const cleanId = sellerId.trim()
  if (!cleanId) {
    return { seller: null, proposals: [] }
  }

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('id', cleanId)
    .maybeSingle()

  if (sellerError) {
    console.error('Error fetching seller in getSellerWithProposals:', sellerError)
    throw new Error(sellerError.message)
  }

  if (!seller) {
    return { seller: null, proposals: [] }
  }

  // Retrieve applicant profile data if user_id exists
  if (seller.user_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at')
      .eq('id', seller.user_id)
      .maybeSingle()

    if (profile) {
      seller.profile = profile
    }
  }

  const { data: proposals, error: proposalsError } = await supabase
    .from('commission_proposals')
    .select('*')
    .eq('seller_id', cleanId)
    .order('created_at', { ascending: true })

  if (proposalsError) {
    console.error('Error fetching proposals in getSellerWithProposals:', proposalsError)
    return { seller, proposals: [] }
  }

  return { seller, proposals: proposals || [] }
}

export async function proposeCommission(sellerId: string, rate: number, message?: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const userClient = await createClient()
  const { data: { user } } = await userClient.auth.getUser()

  const cleanId = (sellerId || '').trim()

  const { error: proposalError } = await supabase
    .from('commission_proposals')
    .insert({
      seller_id: cleanId,
      proposed_rate: rate,
      status: 'pending',
      admin_message: message || null,
      created_by: user?.id || null
    })

  if (proposalError) throw new Error(proposalError.message)

  // Update seller status to commission_proposed if it's currently pending or commission_negotiation
  const { error: sellerError } = await supabase
    .from('sellers')
    .update({ seller_status: 'commission_proposed' })
    .eq('id', cleanId)

  if (sellerError) throw new Error(sellerError.message)

  notifySellerAccountStatusChanged(cleanId, 'commission_proposed', message).catch(() => {})

  revalidatePath('/admin/sellers')
  revalidatePath(`/admin/sellers/${cleanId}`)
  revalidatePath('/seller/dashboard')
}

export async function approveCommissionRequest(sellerId: string, proposalId: string, approvedRate: number) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const cleanSellerId = (sellerId || '').trim()

  // Update proposal
  const { error: proposalError } = await supabase
    .from('commission_proposals')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', proposalId)

  if (proposalError) throw new Error(proposalError.message)

  // Update seller
  await updateSellerStatus(cleanSellerId, 'approved', approvedRate)

  revalidatePath('/admin/sellers')
  revalidatePath(`/admin/sellers/${cleanSellerId}`)
}

// -------------------------------------------------------------
// PRODUCTS & ORDERS (ADMIN)
// -------------------------------------------------------------

export async function getPendingProducts() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('products')
    .select('*, sellers(store_name), product_images(url, display_order)')
    .in('approval_status', ['submitted', 'draft', 'rejected', 'approved']) // Fetch all for admin view
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function updateProductApproval(
  productId: string, 
  status: string, 
  reason?: string,
  affectedFields?: AffectedFieldKey[],
  additionalNotes?: string
) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized: Admin access required.')
  const supabase = getAdminSupabase()

  const cleanId = (productId || '').trim()
  if (!cleanId) {
    throw new Error('Product ID or slug is required.')
  }

  // Support both UUID and slug in case route parameter or slug was passed
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId)

  let findQuery = supabase
    .from('products')
    .select('id, name, slug, seller_id, approval_status, is_active, published_at, details, rejection_reason')

  if (isUuid) {
    findQuery = findQuery.eq('id', cleanId)
  } else {
    findQuery = findQuery.eq('slug', cleanId)
  }

  const { data: existing, error: findError } = await findQuery.maybeSingle()

  if (findError) {
    throw new Error(`Database error verifying product: ${findError.message}`)
  }

  if (!existing) {
    throw new Error(`Product "${cleanId}" not found in database.`)
  }

  // Prepare revision feedback if status is rejected
  let serializedReason: string | null = null
  let notificationReason: string | undefined = undefined
  let updatedDetails = existing.details

  if (status === 'rejected') {
    const rawReason = (reason || '').trim()
    let parsedFeedback = parseRevisionFeedback(rawReason)

    if (affectedFields && affectedFields.length > 0) {
      parsedFeedback = {
        instructions: (parsedFeedback?.instructions || rawReason || 'Changes requested by SENO admin.').trim(),
        affected_fields: affectedFields,
        additional_notes: additionalNotes || parsedFeedback?.additional_notes || '',
        requested_at: new Date().toISOString(),
        status: 'pending_revision'
      }
    } else if (!parsedFeedback) {
      parsedFeedback = {
        instructions: rawReason || 'Changes requested by SENO admin.',
        affected_fields: [],
        additional_notes: additionalNotes || '',
        requested_at: new Date().toISOString(),
        status: 'pending_revision'
      }
    }

    serializedReason = serializeRevisionFeedback(parsedFeedback)
    notificationReason = parsedFeedback.instructions
    updatedDetails = appendRevisionHistory(existing.details, parsedFeedback)
  }

  // Perform authoritative status update
  const updatePayload: any = {
    approval_status: status,
    rejection_reason: status === 'rejected' ? serializedReason : null,
    details: updatedDetails,
    updated_at: new Date().toISOString()
  }

  if (status === 'approved' && !existing.published_at) {
    updatePayload.published_at = new Date().toISOString()
  }

  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', existing.id)
    .select('id, name, slug, seller_id, approval_status, is_active')
    .single()

  if (updateError) {
    throw new Error(`Failed to update approval status: ${updateError.message}`)
  }

  if (!updatedProduct) {
    throw new Error(`Product "${existing.name}" (${existing.id}) was not found during update verification.`)
  }

  // Security Invariant: Approval must NEVER transfer or mutate product ownership
  if (updatedProduct.seller_id !== existing.seller_id) {
    throw new Error('Critical error: Product ownership altered during approval.')
  }

  // Dispatch seller notification if product belongs to a seller
  try {
    await notifySellerProductDecision(existing.id, status as any, notificationReason || reason)
  } catch (notifErr) {
    console.warn('Failed to send seller notification:', notifErr)
  }

  revalidatePath('/admin/products')
  revalidatePath('/seller/products')
  revalidatePath(`/seller/products/${existing.id}/revisions`)
  revalidatePath('/seller/dashboard')
  if (existing.slug) {
    revalidatePath(`/products/${existing.slug}`)
  }
  revalidatePath('/')
  revalidatePath('/collections/all')

  return { success: true, product: updatedProduct }
}

export async function getPlatformOrders() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(full_name, email, phone),
      order_items(
        *,
        sellers(id, store_name, seller_type, slug),
        products(
          product_images(url, is_primary)
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function getAdminOrderById(orderId: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(full_name, email, phone),
      order_items(
        *,
        sellers(id, store_name, seller_type, slug),
        products(
          product_images(url, is_primary)
        )
      )
    `)
    .eq('id', orderId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateAdminOrderFulfillment(formData: FormData): Promise<void> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const orderItemId = String(formData.get('orderItemId') || '')
  const status = String(formData.get('status') || 'unfulfilled')
  const trackingNumber = String(formData.get('trackingNumber') || '').trim()
  const carrier = String(formData.get('carrier') || '').trim()
  const estimatedDeliveryDate = String(formData.get('estimatedDeliveryDate') || '').trim()

  if (!orderItemId) {
    throw new Error('Order item is required.')
  }

  const allowedStatuses = ['unfulfilled', 'processing', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'delivery_failed']
  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid fulfillment status.')
  }

  const updatePayload: Record<string, any> = {
    fulfillment_status: status,
    tracking_number: trackingNumber || null,
    carrier: carrier || null,
    estimated_delivery_date: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : null,
    updated_at: new Date().toISOString()
  }

  if (status === 'delivered') {
    updatePayload.delivered_at = new Date().toISOString()
  } else if (status === 'in_transit' || status === 'dispatched') {
    updatePayload.in_transit_at = new Date().toISOString()
  } else if (status === 'out_for_delivery') {
    updatePayload.out_for_delivery_at = new Date().toISOString()
  }

  const { data: itemData, error } = await supabase
    .from('order_items')
    .update(updatePayload)
    .eq('id', orderItemId)
    .select('order_id')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  notifyOrderItemFulfillmentChanged(orderItemId, status, trackingNumber, carrier).catch(() => {})

  revalidatePath('/admin/orders')
  revalidatePath('/seller/orders')
  revalidatePath('/account')
  if (itemData?.order_id) {
    revalidatePath(`/admin/orders/${itemData.order_id}`)
    revalidatePath(`/account/orders/${itemData.order_id}`)
    revalidatePath(`/account/orders/${itemData.order_id}/track`)
  }
}

export async function updateAdminSellerGroupFulfillment(formData: FormData): Promise<void> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const orderId = String(formData.get('orderId') || '')
  const sellerId = String(formData.get('sellerId') || '')
  const status = String(formData.get('status') || 'unfulfilled')
  const trackingNumber = String(formData.get('trackingNumber') || '').trim()
  const carrier = String(formData.get('carrier') || '').trim()
  const estimatedDeliveryDate = String(formData.get('estimatedDeliveryDate') || '').trim()

  if (!orderId || !sellerId) {
    throw new Error('Order ID and Seller ID are required.')
  }

  const allowedStatuses = ['unfulfilled', 'processing', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'delivery_failed']
  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid fulfillment status.')
  }

  const updatePayload: Record<string, any> = {
    fulfillment_status: status,
    tracking_number: trackingNumber || null,
    carrier: carrier || null,
    estimated_delivery_date: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : null,
    updated_at: new Date().toISOString()
  }

  if (status === 'delivered') {
    updatePayload.delivered_at = new Date().toISOString()
  } else if (status === 'in_transit' || status === 'dispatched') {
    updatePayload.in_transit_at = new Date().toISOString()
  } else if (status === 'out_for_delivery') {
    updatePayload.out_for_delivery_at = new Date().toISOString()
  }

  let query = supabase.from('order_items').update(updatePayload).eq('order_id', orderId)
  if (sellerId === 'null' || sellerId === 'missing') {
    query = query.is('seller_id', null)
  } else {
    query = query.eq('seller_id', sellerId)
  }

  const { data: updatedItems, error } = await query.select('id')

  if (error) {
    throw new Error(error.message)
  }

  if (updatedItems && updatedItems.length > 0) {
    for (const itm of updatedItems) {
      notifyOrderItemFulfillmentChanged(itm.id, status, trackingNumber, carrier).catch(() => {})
    }
  }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/seller/orders')
  revalidatePath('/account')
  revalidatePath(`/account/orders/${orderId}`)
  revalidatePath(`/account/orders/${orderId}/track`)
}

export interface AdminOverviewStats {
  totalRevenue: number
  totalOrdersCount: number
  paidOrdersCount: number
  pendingOrdersCount: number
  totalSellersCount: number
  approvedSellersCount: number
  pendingSellersCount: number
  totalProductsCount: number
  approvedProductsCount: number
  pendingProductsCount: number
  recentOrders: any[]
  recentSellers: any[]
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  // 1. Orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, total_amount, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  const allOrders = orders || []
  const paidOrders = allOrders.filter(o => o.payment_status === 'paid')
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  const pendingOrders = allOrders.filter(o => o.status === 'pending' || o.payment_status === 'unpaid')

  // 2. Sellers
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, store_name, slug, seller_type, seller_status, commission_rate, contact_email, created_at')
    .order('created_at', { ascending: false })

  const allSellers = sellers || []
  const approvedSellers = allSellers.filter(s => s.seller_status === 'approved')
  const pendingSellers = allSellers.filter(s => s.seller_status === 'pending')

  // 3. Products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, price, approval_status, is_active, created_at, sellers(store_name)')
    .order('created_at', { ascending: false })

  const allProducts = products || []
  const approvedProducts = allProducts.filter(p => p.approval_status === 'approved')
  const pendingProducts = allProducts.filter(p => p.approval_status === 'submitted')

  return {
    totalRevenue,
    totalOrdersCount: allOrders.length,
    paidOrdersCount: paidOrders.length,
    pendingOrdersCount: pendingOrders.length,
    totalSellersCount: allSellers.length,
    approvedSellersCount: approvedSellers.length,
    pendingSellersCount: pendingSellers.length,
    totalProductsCount: allProducts.length,
    approvedProductsCount: approvedProducts.length,
    pendingProductsCount: pendingProducts.length,
    recentOrders: allOrders.slice(0, 6),
    recentSellers: allSellers.slice(0, 6)
  }
}

export async function getAdminCustomers() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const [profilesRes, ordersRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, user_id, total_amount, payment_status, created_at')
  ])

  const profiles = profilesRes.data || []
  const orders = ordersRes.data || []

  const ordersByUser: Record<string, { count: number; totalSpent: number; lastOrderAt?: string }> = {}
  for (const o of orders) {
    if (!o.user_id) continue
    if (!ordersByUser[o.user_id]) {
      ordersByUser[o.user_id] = { count: 0, totalSpent: 0 }
    }
    ordersByUser[o.user_id].count += 1
    if (o.payment_status === 'paid') {
      ordersByUser[o.user_id].totalSpent += Number(o.total_amount || 0)
    }
    if (!ordersByUser[o.user_id].lastOrderAt || new Date(o.created_at) > new Date(ordersByUser[o.user_id].lastOrderAt!)) {
      ordersByUser[o.user_id].lastOrderAt = o.created_at
    }
  }

  return profiles.map(p => ({
    ...p,
    ordersCount: ordersByUser[p.id]?.count || 0,
    totalSpent: ordersByUser[p.id]?.totalSpent || 0,
    lastOrderAt: ordersByUser[p.id]?.lastOrderAt || null
  }))
}

export async function getAdminPaymentsData() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, subtotal_amount, shipping_amount, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return orders || []
}
