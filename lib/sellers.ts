'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type SellerStatus = 'pending' | 'approved' | 'suspended' | 'rejected'

export interface Seller {
  id: string
  user_id: string
  store_name: string
  slug: string
  description?: string
  logo_url?: string
  banner_url?: string
  seller_type: 'platform' | 'reseller'
  seller_status: SellerStatus
  commission_rate: number
  contact_email?: string
  contact_phone?: string
  payout_details?: any
  created_at: string
}

/**
 * Register a new reseller account.
 */
export async function registerSeller(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to register as a seller.')
  }

  const store_name = formData.get('store_name') as string
  const slug = formData.get('slug') as string
  const description = formData.get('description') as string
  const contact_email = formData.get('contact_email') as string
  const contact_phone = formData.get('contact_phone') as string

  if (!store_name || !slug || !contact_email) {
    throw new Error('Missing required fields.')
  }

  // The database RLS `sellers_owner_insert` enforces user_id, seller_type='reseller',
  // seller_status='pending', and commission_rate=0.00.
  const { data, error } = await supabase
    .from('sellers')
    .insert({
      user_id: user.id,
      store_name,
      slug,
      description,
      contact_email,
      contact_phone,
      seller_type: 'reseller',
      seller_status: 'pending',
      commission_rate: 0.00
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to register seller:', error)
    throw new Error(error.message)
  }

  revalidatePath('/account')
  revalidatePath('/seller/dashboard')
  
  return { seller: data as Seller }
}

/**
 * Fetch the authenticated user's seller record.
 */
export async function getMySellerRecord() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching seller record:', error)
    return null
  }

  return data as Seller | null
}

export async function getSellerProducts() {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) return []

  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching seller products:', error)
    return []
  }
  return data
}

export async function getSellerOrders() {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) return []

  const { data, error } = await supabase
    .from('order_items')
    .select('*, orders(order_number, status, payment_status, created_at, shipping_address)')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching seller orders:', error)
    return []
  }
  return data
}

export async function updateFulfillmentStatus(orderItemId: string, status: string, tracking: string, carrier: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('order_items')
    .update({ 
      fulfillment_status: status,
      tracking_number: tracking || null,
      carrier: carrier || null
    })
    .eq('id', orderItemId)
    
  if (error) {
    throw new Error(error.message)
  }
  
  revalidatePath('/seller/orders')
  revalidatePath('/admin/orders')
}
