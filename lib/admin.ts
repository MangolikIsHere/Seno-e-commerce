'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { notifyOrderItemFulfillmentChanged, notifyRefundEvent } from '@/lib/notifications/service'

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).')
  }
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
}

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

  revalidatePath('/admin/sellers')
}

// -------------------------------------------------------------
// COMMISSION NEGOTIATION (ADMIN)
// -------------------------------------------------------------

export async function getSellerWithProposals(sellerId: string) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('id', sellerId)
    .single()

  if (sellerError) throw new Error(sellerError.message)

  const { data: proposals, error: proposalsError } = await supabase
    .from('commission_proposals')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: true })

  if (proposalsError) throw new Error(proposalsError.message)

  return { seller, proposals }
}

export async function proposeCommission(sellerId: string, rate: number, message?: string) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const { data: { user } } = await supabase.auth.getUser()

  const { error: proposalError } = await supabase
    .from('commission_proposals')
    .insert({
      seller_id: sellerId,
      proposed_rate: rate,
      status: 'pending',
      admin_message: message,
      created_by: user?.id
    })

  if (proposalError) throw new Error(proposalError.message)

  // Update seller status to commission_proposed if it's currently pending or commission_negotiation
  const { error: sellerError } = await supabase
    .from('sellers')
    .update({ seller_status: 'commission_proposed' })
    .eq('id', sellerId)

  if (sellerError) throw new Error(sellerError.message)

  revalidatePath('/admin/sellers')
  revalidatePath(`/admin/sellers/${sellerId}`)
}

export async function approveCommissionRequest(sellerId: string, proposalId: string, approvedRate: number) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  // Update proposal
  const { error: proposalError } = await supabase
    .from('commission_proposals')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', proposalId)

  if (proposalError) throw new Error(proposalError.message)

  // Update seller
  await updateSellerStatus(sellerId, 'approved', approvedRate)

  revalidatePath('/admin/sellers')
  revalidatePath(`/admin/sellers/${sellerId}`)
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

export async function updateProductApproval(productId: string, status: string, reason?: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const { error } = await supabase
    .from('products')
    .update({
      approval_status: status,
      rejection_reason: reason || null
    })
    .eq('id', productId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/products')
  revalidatePath('/seller/products')
}

export async function getPlatformOrders() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')
  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, email), order_items(*, sellers(store_name, slug))')
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
        sellers(store_name, seller_type, slug),
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

  const { data: itemData, error } = await supabase
    .from('order_items')
    .update({
      fulfillment_status: status,
      tracking_number: trackingNumber || null,
      carrier: carrier || null,
      estimated_delivery_date: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : null
    })
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
