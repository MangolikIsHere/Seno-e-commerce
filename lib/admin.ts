'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function checkIsAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return data?.role === 'admin'
}

export async function getPendingSellers() {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_type', 'reseller')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function updateSellerStatus(sellerId: string, status: string, commissionRate?: number) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const updates: any = { seller_status: status }
  if (commissionRate !== undefined) {
    updates.commission_rate = commissionRate
  }

  const { error } = await supabase
    .from('sellers')
    .update(updates)
    .eq('id', sellerId)

  if (error) throw new Error(error.message)

  // Also update the profile role if approved
  if (status === 'approved') {
    // Wait, profiles.role can only be updated by admins via service_role or trigger,
    // but the `profiles_admin_all` policy allows admins to update roles!
    const { data: seller } = await supabase.from('sellers').select('user_id').eq('id', sellerId).single()
    if (seller) {
      await supabase.from('profiles').update({ role: 'reseller' }).eq('id', seller.user_id)
    }
  }

  revalidatePath('/admin/sellers')
}

export async function getPendingProducts() {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('products')
    .select('*, sellers(store_name), product_images(url, display_order)')
    .in('approval_status', ['submitted', 'draft', 'rejected', 'approved']) // Fetch all for admin view
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function updateProductApproval(productId: string, status: string, reason?: string) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

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
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('orders')
    .select('*, profiles(full_name, email)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
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
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

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

