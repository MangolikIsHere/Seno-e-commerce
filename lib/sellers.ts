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
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    throw new Error('Only approved sellers can submit products')
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
        price,
        compare_at_price,
        default_weight_grams,
        category_id: category_id || null,
        shipping_method,
        custom_delivery_charge: shipping_method === 'custom' ? custom_delivery_charge : null,
        // Trigger `enforce_product_rules` will automatically revert approval status 
        // to `submitted` if there are material changes to an approved product.
      })
      .eq('id', productId)
      .eq('seller_id', seller.id)

    if (productError) throw new Error(productError.message)

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
        price,
        compare_at_price,
        default_weight_grams,
        category_id: category_id || null,
        approval_status: 'submitted',
        shipping_method,
        custom_delivery_charge: shipping_method === 'custom' ? custom_delivery_charge : null
      })
      .select()
      .single()

    if (productError || !product) throw new Error(productError?.message || 'Failed to create product')
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
