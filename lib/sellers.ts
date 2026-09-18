'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export type SellerStatus = 'pending' | 'commission_proposed' | 'commission_negotiation' | 'approved' | 'suspended' | 'rejected'

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

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseClient(supabaseUrl, supabaseServiceKey)
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

// -------------------------------------------------------------
// COMMISSION NEGOTIATION (SELLER)
// -------------------------------------------------------------

export async function getSellerProposals() {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) return []

  const { data, error } = await supabase
    .from('commission_proposals')
    .select('*')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching proposals:', error)
    return []
  }

  return data
}

export async function acceptCommissionProposal(proposalId: string) {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) throw new Error('Unauthorized')

  // Get the proposal to find the rate
  const { data: proposal, error: proposalError } = await supabase
    .from('commission_proposals')
    .select('*')
    .eq('id', proposalId)
    .eq('seller_id', seller.id)
    .single()

  if (proposalError || !proposal) throw new Error('Proposal not found')

  // Update proposal status (Seller can do this via normal client because of RLS)
  const { error: updatePropError } = await supabase
    .from('commission_proposals')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', proposalId)

  if (updatePropError) throw new Error(updatePropError.message)

  // Use service role to update restricted fields
  const adminSupabase = getAdminSupabase()
  
  const { error: sellerError } = await adminSupabase
    .from('sellers')
    .update({ 
      seller_status: 'approved', 
      commission_rate: proposal.proposed_rate 
    })
    .eq('id', seller.id)

  if (sellerError) throw new Error(sellerError.message)

  // Elevate user role
  await adminSupabase.from('profiles').update({ role: 'reseller' }).eq('id', seller.user_id)

  revalidatePath('/seller/dashboard')
  revalidatePath('/account')
}

export async function requestCommissionChange(proposalId: string, requestedRate: number, reason: string) {
  if (requestedRate < 0 || requestedRate > 100) throw new Error('Invalid rate')
  if (!reason || reason.trim().length < 10) throw new Error('Please provide a detailed reason')

  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) throw new Error('Unauthorized')

  // Update proposal
  const { error: proposalError } = await supabase
    .from('commission_proposals')
    .update({ 
      seller_requested_rate: requestedRate,
      seller_request_reason: reason,
      status: 'rejected_by_seller',
      responded_at: new Date().toISOString()
    })
    .eq('id', proposalId)
    .eq('seller_id', seller.id)

  if (proposalError) throw new Error(proposalError.message)

  // Update seller status to negotiation
  const adminSupabase = getAdminSupabase()
  const { error: sellerError } = await adminSupabase
    .from('sellers')
    .update({ seller_status: 'commission_negotiation' })
    .eq('id', seller.id)

  if (sellerError) throw new Error(sellerError.message)

  revalidatePath('/seller/dashboard')
}

// -------------------------------------------------------------
// PRODUCTS (SELLER)
// -------------------------------------------------------------

export async function getSellerProducts() {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) return []

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug), product_images(*), product_variants(id, sku, size, colour, is_active, inventory(quantity, low_stock_threshold))')
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching seller products:', error)
    return []
  }
  return (data || []).map((product: any) => ({
    ...product,
    primary_image: product.product_images?.find((image: any) => image.is_primary)?.url || product.product_images?.[0]?.url || '/placeholder.png',
    total_stock: (product.product_variants || []).reduce((sum: number, variant: any) => {
      const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory
      return sum + (variant.is_active ? Number(inventory?.quantity || 0) : 0)
    }, 0),
    low_stock: (product.product_variants || []).some((variant: any) => {
      const inventory = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory
      const quantity = Number(inventory?.quantity || 0)
      return variant.is_active && quantity > 0 && quantity <= Number(inventory?.low_stock_threshold || 5)
    })
  }))
}

export async function toggleProductSoldOutAction(formData: FormData) {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) throw new Error('Unauthorized: No seller record found.')

  const productId = String(formData.get('productId') || '')
  const isSoldOutStr = String(formData.get('isSoldOut') || 'false')
  const isSoldOut = isSoldOutStr === 'true'

  if (!productId) throw new Error('Product ID is required.')

  const { data, error } = await supabase
    .from('products')
    .update({ is_sold_out: isSoldOut, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('seller_id', seller.id)
    .select('slug')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Product not found or you do not have permission to modify it.')
  }

  revalidatePath('/seller/products')
  revalidatePath('/seller/dashboard')
  if (data.slug) {
    revalidatePath(`/products/${data.slug}`)
  }
  revalidatePath('/') // catalog home
  
  return { success: true }
}

export async function getSellerStudioStats() {
  const seller = await getMySellerRecord()
  if (!seller) return null
  const products = await getSellerProducts()
  const orders = await getSellerOrders()
  const pendingProducts = products.filter((product: any) => product.approval_status === 'submitted')
  const lowStockProducts = products.filter((product: any) => product.low_stock)
  const outOfStockProducts = products.filter((product: any) => product.total_stock === 0)

  return {
    seller,
    products,
    metrics: {
      totalProducts: products.length,
      activeProducts: products.filter((product: any) => product.is_active && product.approval_status === 'approved').length,
      pendingReview: pendingProducts.length,
      lowStock: lowStockProducts.length,
      outOfStock: outOfStockProducts.length,
      orders: orders.length,
      commissionRate: Number(seller.commission_rate || 0)
    },
    actions: [
      ...pendingProducts.map((product: any) => ({ label: `${product.name} is awaiting review`, href: '/seller/products' })),
      ...lowStockProducts.map((product: any) => ({ label: `${product.name} needs stock attention`, href: '/seller/products' })),
      ...outOfStockProducts.map((product: any) => ({ label: `${product.name} is out of stock`, href: '/seller/products' }))
    ].slice(0, 6)
  }
}

export async function submitSellerProduct(formData: FormData, images: any[], variants: any[], productId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in to create or edit a product.')
  }

  const seller = await getMySellerRecord()
  
  if (!seller) {
    throw new Error('No approved seller account is associated with your account.')
  }

  if (seller.seller_status !== 'approved') {
    throw new Error('Your seller application must be approved before you can create products.')
  }

  if (seller.seller_type !== 'reseller') {
    throw new Error('Only registered reseller accounts can create products via Seller Studio.')
  }

  // Reject any malicious client-supplied seller_id
  const clientProvidedSellerId = formData.get('seller_id')
  if (clientProvidedSellerId && clientProvidedSellerId !== seller.id) {
    throw new Error('Unauthorized: You cannot specify or tamper with seller_id.')
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const compare_at_price = formData.get('compare_at_price') ? parseFloat(formData.get('compare_at_price') as string) : null
  const default_weight_grams = parseFloat(formData.get('weight') as string) || 500
  const shipping_method = formData.get('shipping_method') === 'custom' ? 'custom' : 'weight_based'
  const custom_delivery_charge = formData.get('custom_delivery_charge') ? parseFloat(formData.get('custom_delivery_charge') as string) : null
  const category_id = formData.get('category_id') as string
  const collection_ids = JSON.parse(String(formData.get('collection_ids') || '[]')) as string[]

  const is_returnable = formData.get('is_returnable') === 'false' ? false : true
  const return_window_days = is_returnable ? (parseInt(formData.get('return_window_days') as string, 10) || 14) : 0
  const return_policy_notes = (formData.get('return_policy_notes') as string) || ''

  let baseDetails: any[] = []
  try {
    const rawDetails = formData.get('details') as string
    if (rawDetails) {
      baseDetails = JSON.parse(rawDetails)
      if (!Array.isArray(baseDetails)) baseDetails = []
    }
  } catch {
    baseDetails = []
  }

  const cleanDetails = baseDetails.filter((d: any) => typeof d === 'string' && !d.toLowerCase().startsWith('return policy:'))

  const detailsPayload = [
    {
      __return_policy: {
        is_returnable,
        return_window_days,
        notes: return_policy_notes
      }
    },
    is_returnable
      ? `Return Policy: ${return_window_days} Days Return & Exchange`
      : 'Return Policy: Final Sale (Non-Returnable)',
    ...cleanDetails
  ]

  const rawApprovalStatus = formData.get('approval_status') as string
  const approval_status: 'draft' | 'submitted' = rawApprovalStatus === 'submitted' ? 'submitted' : 'draft'

  if (!name || !slug || isNaN(price) || price < 0 || (compare_at_price !== null && (isNaN(compare_at_price) || compare_at_price < 0))) throw new Error('Missing or invalid product information')
  if (shipping_method === 'custom' && (custom_delivery_charge === null || !Number.isFinite(custom_delivery_charge) || custom_delivery_charge < 0)) throw new Error('A non-negative custom delivery charge is required')

  let finalProductId = productId

  const { data: duplicateSlug } = await supabase.from('products').select('id').eq('slug', slug).neq('id', productId || '00000000-0000-0000-0000-000000000000').maybeSingle()
  if (duplicateSlug) throw new Error('This URL slug is already in use.')

  if (productId) {
    // Update Product
    const { error: productError } = await supabase
      .from('products')
      .update({
        name,
        slug,
        description,
        details: detailsPayload,
        price,
        compare_at_price,
        default_weight_grams,
        category_id: category_id || null,
        shipping_method,
        custom_delivery_charge: shipping_method === 'custom' ? custom_delivery_charge : null,
        // Set status to submitted if requested (for review), or draft (to unpublish)
        ...(rawApprovalStatus === 'submitted' ? { approval_status: 'submitted' } : rawApprovalStatus === 'draft' ? { approval_status: 'draft' } : {})
      })
      .eq('id', productId)
      .eq('seller_id', seller.id)

    if (productError) {
      const msg = productError.message
      if (msg.includes('Administrators can only create products belonging to the SENO platform seller')) {
        throw new Error('No approved seller account is associated with your account.')
      }
      if (msg.includes('Seller account is not approved to create products')) {
        throw new Error('Your seller application must be approved before you can create products.')
      }
      throw new Error(productError.message)
    }

    // Handle images (delete old, insert new)
    await supabase.from('product_images').delete().eq('product_id', productId)
    if (images && images.length > 0) {
      await supabase.from('product_images').insert(
        images.map((img, i) => ({
          product_id: productId,
          url: img.url,
          display_order: i,
          is_primary: i === 0
        }))
      )
    }

    await supabase.from('collection_products').delete().eq('product_id', productId)
    if (collection_ids.length) await supabase.from('collection_products').insert(collection_ids.map((collection_id, display_order) => ({ collection_id, product_id: productId, display_order })))

    // Handle variants
    // 1. Fetch existing variants
    const { data: existingVariants } = await supabase.from('product_variants').select('id, sku').eq('product_id', productId)
    const existingSkus = existingVariants?.map(v => v.sku) || []
    
    for (const v of variants) {
      if (existingSkus.includes(v.sku)) {
        // Update existing variant stock
        const existingVar = existingVariants?.find(ev => ev.sku === v.sku)
        if (existingVar) {
          await supabase.from('product_variants').update({ size: v.size || null, colour: v.colour || null }).eq('id', existingVar.id)
          await supabase.from('inventory').update({ quantity: parseInt(v.quantity) || 0 }).eq('variant_id', existingVar.id)
        }
      } else {
        // Insert new variant
        const { data: newVar } = await supabase.from('product_variants').insert({
          product_id: productId, size: v.size || null, colour: v.colour || null, sku: v.sku
        }).select().single()
        if (newVar) {
          await supabase.from('inventory').insert({ variant_id: newVar.id, quantity: parseInt(v.quantity) || 0 })
        }
      }
    }

    // Remove deleted variants
    const incomingSkus = variants.map(v => v.sku)
    const skusToDelete = existingSkus.filter(sku => !incomingSkus.includes(sku))
    if (skusToDelete.length > 0) {
      const varsToDelete = existingVariants?.filter(v => skusToDelete.includes(v.sku))
      if (varsToDelete) {
        for (const vd of varsToDelete) {
          await supabase.from('product_variants').delete().eq('id', vd.id)
        }
      }
    }
  } else {
    // Insert Product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        seller_id: seller.id,
        name,
        slug,
        description,
        details: detailsPayload,
        price,
        compare_at_price,
        default_weight_grams,
        category_id: category_id || null,
        approval_status,
        shipping_method,
        custom_delivery_charge: shipping_method === 'custom' ? custom_delivery_charge : null
      })
      .select()
      .single()

    if (productError || !product) {
      const msg = productError?.message || ''
      if (msg.includes('Administrators can only create products belonging to the SENO platform seller')) {
        throw new Error('No approved seller account is associated with your account.')
      }
      if (msg.includes('Seller account is not approved to create products')) {
        throw new Error('Your seller application must be approved before you can create products.')
      }
      if (msg.includes('No seller record associated with current account')) {
        throw new Error('No approved seller account is associated with your account.')
      }
      throw new Error(productError?.message || 'Failed to create product')
    }
    finalProductId = product.id

    // Insert Images
    if (images && images.length > 0) {
      await supabase.from('product_images').insert(
        images.map((img, i) => ({
          product_id: product.id,
          url: img.url,
          display_order: i,
          is_primary: i === 0
        }))
      )
    }

    if (collection_ids.length) await supabase.from('collection_products').insert(collection_ids.map((collection_id, display_order) => ({ collection_id, product_id: product.id, display_order })))

    // Insert Variants
    if (variants && variants.length > 0) {
      for (const v of variants) {
        const { data: variant, error: varError } = await supabase
          .from('product_variants')
          .insert({
            product_id: product.id,
            size: v.size || null,
            colour: v.colour || null,
            sku: v.sku
          })
          .select()
          .single()
          
        if (!varError && variant) {
          await supabase
            .from('inventory')
            .insert({
              variant_id: variant.id,
              quantity: parseInt(v.quantity) || 0
            })
        }
      }
    }
  }

  revalidatePath('/seller/products')
  if (finalProductId) {
    revalidatePath(`/seller/products/${finalProductId}`)
  }
  return { id: finalProductId }
}

/**
 * Dedicated server action to quickly update variant inventory for sellers.
 * Bypasses the full product edit lifecycle to allow instant stock updates without review resets.
 */
export async function updateSellerVariantInventory(variantId: string, quantity: number) {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) throw new Error('Unauthorized: No seller record found.')

  // Verify the variant belongs to the authenticated seller
  const { data: variant, error: varError } = await supabase
    .from('product_variants')
    .select('id, products!inner(seller_id, slug)')
    .eq('id', variantId)
    .single()

  if (varError || !variant || (variant.products as any).seller_id !== seller.id) {
    throw new Error('Unauthorized or variant not found.')
  }

  const qty = Math.max(0, Number(quantity))

  // Upsert inventory
  const { data: invRow } = await supabase
    .from('inventory')
    .select('id')
    .eq('variant_id', variantId)
    .single()

  if (invRow) {
    const { error } = await supabase
      .from('inventory')
      .update({ quantity: qty, updated_at: new Date().toISOString() })
      .eq('variant_id', variantId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('inventory')
      .insert({ variant_id: variantId, quantity: qty, low_stock_threshold: 5 })
    if (error) throw new Error(error.message)
  }

  const slug = (variant.products as any).slug
  revalidatePath('/seller/products')
  if (slug) revalidatePath(`/products/${slug}`)
  
  return { success: true, quantity: qty }
}

/**
 * Dedicated server action for creating products as an authenticated reseller.
 * Verifies seller authorization server-side, derives seller_id automatically,
 * rejects client tampering, and ensures products are created in draft/submitted state.
 */
export async function createSellerProduct(formData: FormData, images: any[], variants: any[]) {
  return submitSellerProduct(formData, images, variants)
}

export async function getSellerOrders() {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) return []

  const { data, error } = await supabase
    .from('order_items')
    .select('*, orders!inner(order_number, status, payment_status, created_at, shipping_address)')
    .eq('seller_id', seller.id)
    .eq('orders.payment_status', 'paid')
    .in('orders.status', ['confirmed', 'processing', 'partially_shipped', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching seller orders:', error)
    return []
  }
  return data
}

export async function getSellerOrderById(orderId: string) {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) return null

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      id,
      seller_id,
      product_name,
      sku,
      variant_details,
      unit_price,
      quantity,
      total_price,
      fulfillment_status,
      tracking_number,
      carrier,
      estimated_delivery_date,
      created_at,
      orders!inner(
        id,
        order_number,
        customer_id,
        status,
        payment_status,
        created_at,
        shipping_address,
        razorpay_order_id,
        razorpay_payment_id,
        profiles!customer_id(full_name, email)
      )
    `)
    .eq('id', orderId)
    .eq('seller_id', seller.id)
    .eq('orders.payment_status', 'paid')
    .maybeSingle()

  if (error || !data) {
    console.error('Error fetching seller order detail:', error)
    return null
  }

  const order = data.orders as any
  const profile = Array.isArray(order?.profiles) ? order.profiles[0] : order?.profiles

  return {
    id: data.id,
    order_number: order?.order_number,
    payment_status: order?.payment_status,
    status: order?.status,
    fulfillment_status: data.fulfillment_status,
    tracking_number: data.tracking_number,
    carrier: data.carrier,
    estimated_delivery_date: data.estimated_delivery_date,
    created_at: order?.created_at || data.created_at,
    shipping_address: order?.shipping_address,
    customer_email: profile?.email || null,
    customer_name: profile?.full_name || null,
    order_items: [{
      id: data.id,
      product_name: data.product_name,
      sku: data.sku,
      variant_details: data.variant_details || {},
      unit_price: data.unit_price,
      quantity: data.quantity,
      total_price: data.total_price,
      fulfillment_status: data.fulfillment_status,
      tracking_number: data.tracking_number,
      carrier: data.carrier,
      estimated_delivery_date: data.estimated_delivery_date,
      image_url: null
    }],
    razorpay_order_id: order?.razorpay_order_id || null,
    razorpay_payment_id: order?.razorpay_payment_id || null
  }
}

export async function updateSellerOrderFulfillment(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) throw new Error('Unauthorized: No active seller account.')

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

  const { error } = await supabase
    .from('order_items')
    .update({
      fulfillment_status: status,
      tracking_number: trackingNumber || null,
      carrier: carrier || null,
      estimated_delivery_date: estimatedDeliveryDate ? new Date(estimatedDeliveryDate).toISOString() : null
    })
    .eq('id', orderItemId)
    .eq('seller_id', seller.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/seller/orders')
  revalidatePath('/seller/dashboard')
  revalidatePath('/admin/orders')
  revalidatePath('/account')
  revalidatePath(`/seller/orders/${orderItemId}`)
}

export async function updateFulfillmentStatus(orderItemId: string, status: string, tracking: string, carrier: string) {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) throw new Error('Unauthorized: No active seller account.')
  
  const { error } = await supabase
    .from('order_items')
    .update({ 
      fulfillment_status: status,
      tracking_number: tracking || null,
      carrier: carrier || null
    })
    .eq('id', orderItemId)
    .eq('seller_id', seller.id)
    
  if (error) {
    throw new Error(error.message)
  }
  
  revalidatePath('/seller/orders')
  revalidatePath('/seller/dashboard')
  revalidatePath('/admin/orders')
  revalidatePath('/admin/orders')
  revalidatePath('/account')
}

export async function cancelAndRefundOrderItemAction(orderItemId: string, reason: string): Promise<void> {
  const supabase = await createClient()
  const seller = await getMySellerRecord()
  if (!seller) throw new Error('Unauthorized: No active seller account.')

  // 1. Call RPC to initiate cancellation and idempotently get refund_event_id
  const { data: cancelRes, error: cancelError } = await supabase.rpc('cancel_paid_order_item', {
    p_order_item_id: orderItemId,
    p_seller_id: seller.id,
    p_reason: reason || 'Cancelled by seller'
  })

  if (cancelError || !cancelRes || !cancelRes.success) {
    throw new Error(cancelRes?.error || cancelError?.message || 'Failed to cancel item.')
  }

  const { refund_event_id, razorpay_payment_id, refundable_amount, is_already_requested } = cancelRes

  // If we already requested it, we can still try to execute the API call just in case it failed previously
  // But wait, if it's already requested, we might want to check the event processing_status.
  // For safety, we will just attempt the API call. Razorpay handles idempotency via receipt if we pass it, 
  // but Razorpay refund API natively might not be idempotent on receipt alone for refunds, it's safer to check status.
  
  // Let's check current processing status
  const { data: eventData } = await supabase
    .from('payment_events')
    .select('processing_status')
    .eq('id', refund_event_id)
    .single()

  if (eventData?.processing_status === 'processed') {
    revalidatePath('/seller/orders')
    revalidatePath('/seller/dashboard')
    revalidatePath('/admin/orders')
    revalidatePath('/account')
    return
  }

  // 2. Call Razorpay Refund API
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_seno_demo_key'
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'seno_demo_secret_key_12345'
  const isMock = keyId.startsWith('rzp_test_seno_demo') || keySecret.startsWith('seno_demo')

  const amountPaise = Math.round(Number(refundable_amount) * 100)
  
  let razorpayRefundId = null
  let refundStatus = 'failed'
  let errorMsg = null

  if (!isMock && razorpay_payment_id && razorpay_payment_id !== 'mock_payment_id') {
    const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
    try {
      const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: amountPaise,
          receipt: refund_event_id,
          notes: {
            order_item_id: orderItemId,
            seller_id: seller.id
          }
        })
      })

      if (rzpResponse.ok) {
        const rzpData = await rzpResponse.json()
        razorpayRefundId = rzpData.id
        refundStatus = rzpData.status === 'processed' ? 'processed' : 'pending' // pending will be updated by webhook
      } else {
        const errText = await rzpResponse.text()
        errorMsg = `Razorpay API error: ${errText}`
        refundStatus = 'failed'
      }
    } catch (err: any) {
      errorMsg = `Network error: ${err.message}`
      refundStatus = 'failed'
    }
  } else {
    // Mock successful refund
    razorpayRefundId = `rfnd_test_${Math.random().toString(36).substring(2, 9)}`
    refundStatus = 'processed'
  }

  // 3. Update refund status
  // We use the admin client since this updates payment events
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await adminSupabase.rpc('update_refund_status', {
    p_refund_event_id: refund_event_id,
    p_status: refundStatus === 'processed' ? 'processed' : (refundStatus === 'failed' ? 'failed' : 'pending'),
    p_razorpay_refund_id: razorpayRefundId,
    p_error_message: errorMsg
  })

  if (refundStatus === 'failed') {
    throw new Error(`Refund initiation failed: ${errorMsg}`)
  }

  revalidatePath('/seller/orders')
  revalidatePath('/seller/dashboard')
  revalidatePath('/admin/orders')
  revalidatePath('/account')
}
