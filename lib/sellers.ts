'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { invalidateProductCache } from '@/lib/catalog-server'
import { notifyOrderItemFulfillmentChanged, getUserNotifications } from '@/lib/notifications/service'
import { checkIsAdmin } from '@/lib/admin'
import { reconcileProductVariants, ReconcileVariantInput } from '@/lib/variantReconciliation'
import { revalidateCatalogPaths } from '@/lib/adminCatalog'
import { getAdminSupabase } from '@/lib/supabaseAdmin'
import { prepareColourDetailsPayload, normalizeColourKey } from '@/lib/colours'
import { 
  parseRevisionFeedback, 
  formatRevisionSummary, 
  markLatestRevisionResubmitted,
  extractRevisionHistory 
} from '@/lib/revisionFeedback'

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
 * Retrieve the official SENO platform seller record.
 */
export async function getPlatformSellerRecord(): Promise<Seller | null> {
  const adminSupabase = getAdminSupabase()
  const { data, error } = await adminSupabase
    .from('sellers')
    .select('*')
    .eq('seller_type', 'platform')
    .eq('seller_status', 'approved')
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    console.error('Failed to resolve SENO platform seller record:', error)
    return null
  }
  return data as Seller
}

/**
 * Fetch the authenticated user's seller record.
 * If the user is an administrator without a separate reseller record,
 * resolves to the official SENO platform seller.
 */
export async function getMySellerRecord(): Promise<Seller | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching seller record:', error)
  }

  if (data) {
    return data as Seller
  }

  // Strictly return null if user does not have a registered seller store.
  // SENO platform products are managed exclusively via the Admin panel.
  return null
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
  const seller = await getMySellerRecord()
  if (!seller) return []

  // Authoritative query strictly isolated to the authenticated seller's store
  const adminSupabase = getAdminSupabase()
  const { data, error } = await adminSupabase
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

/**
 * Effortless Seller Inventory Management:
 * Direct stock updates without needing to reopen the full product creation/edit form.
 * Preserves variant IDs, deletes obsolete combinations, updates quantities, and recalculates products.is_sold_out.
 */
export async function quickUpdateProductInventory(productId: string, variants: ReconcileVariantInput[]) {
  const isAdmin = await checkIsAdmin()
  const seller = await getMySellerRecord()

  if (!isAdmin && (!seller || seller.seller_status !== 'approved')) {
    throw new Error('Unauthorized: You must have an active approved seller account.')
  }

  const cleanId = (productId || '').trim()
  if (!cleanId) {
    throw new Error('Product ID is required.')
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error('Please configure at least one active variant.')
  }

  const adminSupabase = getAdminSupabase()

  // 1. Authoritative validation of product existence and ownership
  const { data: product, error: fetchErr } = await adminSupabase
    .from('products')
    .select('id, name, slug, seller_id')
    .eq('id', cleanId)
    .maybeSingle()

  if (fetchErr || !product) {
    throw new Error('Product not found.')
  }

  // Strict seller isolation
  if (!isAdmin && seller && product.seller_id !== seller.id) {
    throw new Error('Unauthorized: You can only manage inventory for your own products.')
  }

  // 2. Authoritative inventory reconciliation via core variantReconciliation engine
  const reconResult = await reconcileProductVariants(adminSupabase, product.id, variants, {
    productSlug: product.slug
  })

  // 3. Revalidate affected routes and storefront caches
  revalidatePath('/seller/products')
  revalidatePath('/seller/dashboard')
  revalidatePath('/admin/products')
  if (product.slug) {
    revalidatePath(`/products/${product.slug}`)
    invalidateProductCache(product.slug)
  }
  revalidatePath('/')
  revalidatePath('/collections/all')

  return {
    success: true,
    totalStock: reconResult.totalActiveStock,
    isSoldOut: reconResult.isSoldOut,
    activeVariantCount: reconResult.activeVariantIds.length
  }
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
  invalidateProductCache(data.slug)
  
  return { success: true }
}

export async function getSellerStudioStats() {
  return await getSellerDashboardData()
}

export async function getSellerDashboardData() {
  const seller = await getMySellerRecord()
  if (!seller) return null
  const products = await getSellerProducts()
  const orders = await getSellerOrders()
  const notifRes = await getUserNotifications(10)

  const activeProducts = products.filter((product: any) => product.is_active && product.approval_status === 'approved')
  const pendingProducts = products.filter((product: any) => product.approval_status === 'submitted')
  const rejectedProducts = products.filter((product: any) => product.approval_status === 'rejected')
  const lowStockProducts = products.filter((product: any) => product.low_stock && product.total_stock > 0)
  const outOfStockProducts = products.filter((product: any) => product.total_stock === 0)

  const newOrders = orders.filter((o: any) => o.fulfillment_status === 'unfulfilled')
  const processingOrders = orders.filter((o: any) => o.fulfillment_status === 'processing')
  const completedOrders = orders.filter((o: any) => o.fulfillment_status === 'delivered')
  const inTransitOrders = orders.filter((o: any) => ['dispatched', 'in_transit', 'out_for_delivery'].includes(o.fulfillment_status))
  const cancelledOrders = orders.filter((o: any) => ['cancelled', 'returned', 'delivery_failed'].includes(o.fulfillment_status))

  const grossSales = orders.reduce((sum: number, o: any) => sum + Number(o.total_price || 0), 0)
  const commissionDeducted = orders.reduce((sum: number, o: any) => sum + Number(o.commission_amount || 0), 0)
  const netEarnings = orders.reduce((sum: number, o: any) => sum + Number(o.seller_payout_amount || 0), 0)

  const actions: { label: string; href: string; severity?: 'urgent' | 'warning' | 'info' }[] = []
  if (newOrders.length > 0) {
    actions.push({
      label: `${newOrders.length} new customer order item${newOrders.length > 1 ? 's' : ''} awaiting dispatch`,
      href: '/seller/orders',
      severity: 'urgent'
    })
  }
  rejectedProducts.forEach((p: any) => {
    const feedback = parseRevisionFeedback(p.rejection_reason, p.details)
    const summary = feedback ? formatRevisionSummary(feedback) : (p.rejection_reason || 'Check requirements')
    actions.push({
      label: `"${p.name}" requires revisions: ${summary}`,
      href: `/seller/products/${p.id}/revisions`,
      severity: 'urgent'
    })
  })
  outOfStockProducts.forEach((p: any) => {
    actions.push({
      label: `"${p.name}" is completely out of stock`,
      href: '/seller/products',
      severity: 'warning'
    })
  })
  lowStockProducts.forEach((p: any) => {
    actions.push({
      label: `"${p.name}" has variants running low`,
      href: '/seller/products',
      severity: 'info'
    })
  })

  return {
    seller,
    products,
    orders,
    metrics: {
      totalOrders: orders.length,
      newOrders: newOrders.length,
      processingOrders: processingOrders.length,
      completedOrders: completedOrders.length,
      inTransitOrders: inTransitOrders.length,
      cancelledOrders: cancelledOrders.length,
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      pendingReview: pendingProducts.length,
      rejectedProducts: rejectedProducts.length,
      lowStock: lowStockProducts.length,
      outOfStock: outOfStockProducts.length,
      commissionRate: Number(seller.commission_rate || 0),
      grossSales,
      commissionDeducted,
      netEarnings,
      orders: orders.length
    },
    actions: actions.slice(0, 8),
    recentOrders: orders.slice(0, 6),
    recentNotifications: notifRes.notifications.slice(0, 6),
    unreadNotificationsCount: notifRes.unreadCount
  }
}

export async function getSellerEarningsData() {
  const seller = await getMySellerRecord()
  if (!seller) return null

  const orders = await getSellerOrders()

  const grossSales = orders.reduce((sum: number, o: any) => sum + Number(o.total_price || 0), 0)
  const totalCommission = orders.reduce((sum: number, o: any) => sum + Number(o.commission_amount || 0), 0)
  const netEarnings = orders.reduce((sum: number, o: any) => sum + Number(o.seller_payout_amount || 0), 0)

  return {
    seller,
    summary: {
      grossSales,
      totalCommission,
      netEarnings,
      currentCommissionRate: Number(seller.commission_rate || 0),
      paidOrdersCount: orders.length
    },
    items: orders
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

  const cleanDetails = baseDetails.filter((d: any) => {
    if (typeof d === 'string') {
      return !d.toLowerCase().startsWith('return policy:')
    }
    if (d && typeof d === 'object') {
      if (d.__return_policy !== undefined) return false
      if (d.__colour_images !== undefined || d.__colour_primaries !== undefined) return false
      return true
    }
    return false
  })

  const colourImagesMap: Record<string, string[]> = {}
  const colourPrimariesMap: Record<string, string> = {}
  for (const img of images || []) {
    if (img.colour && String(img.colour).trim()) {
      const key = normalizeColourKey(img.colour)
      if (!colourImagesMap[key]) colourImagesMap[key] = []
      if (!colourImagesMap[key].includes(img.url)) {
        colourImagesMap[key].push(img.url)
      }
      if (img.is_colour_primary || !colourPrimariesMap[key]) {
        colourPrimariesMap[key] = img.url
      }
    }
  }

  let colourHexesMap: Record<string, string> = {}
  try {
    const rawHexes = formData.get('colour_hexes')
    if (rawHexes && typeof rawHexes === 'string') {
      colourHexesMap = JSON.parse(rawHexes)
    }
  } catch {
    // Ignore invalid JSON
  }

  const detailsPayload = prepareColourDetailsPayload([
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
  ], colourImagesMap, colourPrimariesMap, colourHexesMap)

  const rawApprovalStatus = formData.get('approval_status') as string
  const approval_status: 'draft' | 'submitted' = rawApprovalStatus === 'submitted' ? 'submitted' : 'draft'

  if (!name || !slug || isNaN(price) || price < 0 || (compare_at_price !== null && (isNaN(compare_at_price) || compare_at_price < 0))) throw new Error('Missing or invalid product information')
  const { data: activeCategory, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', category_id)
    .eq('is_active', true)
    .maybeSingle()
  if (categoryError || !activeCategory) throw new Error('Select one of the active storefront categories.')
  if (shipping_method === 'custom' && (custom_delivery_charge === null || !Number.isFinite(custom_delivery_charge) || custom_delivery_charge < 0)) throw new Error('A non-negative custom delivery charge is required')

  let finalProductId = productId

  const { data: duplicateSlug } = await supabase.from('products').select('id').eq('slug', slug).neq('id', productId || '00000000-0000-0000-0000-000000000000').maybeSingle()
  if (duplicateSlug) throw new Error('This URL slug is already in use.')

  if (productId) {
    const { data: existingProd } = await supabase
      .from('products')
      .select('approval_status, details')
      .eq('id', productId)
      .eq('seller_id', seller.id)
      .maybeSingle()

    let nextApprovalStatus: string | undefined = undefined
    let finalDetails = detailsPayload

    // Guarantee that authoritative revision history from existingProd is never dropped
    const existingRevisionMeta = (existingProd?.details || []).find(
      (d: any) => d && typeof d === 'object' && d.__revision_history
    )
    if (existingRevisionMeta) {
      const alreadyHas = finalDetails.some((d: any) => d && typeof d === 'object' && d.__revision_history)
      if (!alreadyHas) {
        finalDetails = [existingRevisionMeta, ...finalDetails]
      }
    }

    if (rawApprovalStatus === 'submitted') {
      nextApprovalStatus = 'submitted'
      finalDetails = markLatestRevisionResubmitted(finalDetails)
    } else if (rawApprovalStatus === 'draft') {
      // If product was rejected and seller is saving draft edits without resubmitting,
      // retain the requested-revision status until explicitly resubmitted
      if (existingProd?.approval_status === 'rejected') {
        nextApprovalStatus = 'rejected'
      } else {
        nextApprovalStatus = 'draft'
      }
    }

    // Update Product
    const { error: productError } = await supabase
      .from('products')
      .update({
        name,
        slug,
        description,
        details: finalDetails,
        price,
        compare_at_price,
        default_weight_grams,
        category_id: category_id || null,
        shipping_method,
        custom_delivery_charge: shipping_method === 'custom' ? custom_delivery_charge : null,
        ...(nextApprovalStatus ? { approval_status: nextApprovalStatus } : {}),
        ...(nextApprovalStatus === 'submitted' ? { rejection_reason: null } : {})
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

    // Handle images (delete old, insert new with colour assignment)
    await supabase.from('product_images').delete().eq('product_id', productId)
    if (images && images.length > 0) {
      let primaryIndex = images.findIndex(img => img.is_primary)
      if (primaryIndex < 0) primaryIndex = 0

      const fullRows = images.map((img, i) => ({
        product_id: productId,
        url: img.url,
        display_order: i,
        is_primary: i === primaryIndex,
        colour: img.colour?.trim() || null,
        is_colour_primary: !!img.is_colour_primary
      }))

      const { error: imgErr } = await supabase.from('product_images').insert(fullRows)
      if (imgErr) {
        const baseRows = fullRows.map(({ colour, is_colour_primary, ...base }) => base)
        await supabase.from('product_images').insert(baseRows)
      }
    }

    await supabase.from('collection_products').delete().eq('product_id', productId)
    if (collection_ids.length) await supabase.from('collection_products').insert(collection_ids.map((collection_id, display_order) => ({ collection_id, product_id: productId, display_order })))

    // Reconcile variants and inventory authoritatively
    await reconcileProductVariants(supabase, productId, variants, { productSlug: slug })
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

    // Insert Images with colour assignment
    if (images && images.length > 0) {
      let primaryIndex = images.findIndex(img => img.is_primary)
      if (primaryIndex < 0) primaryIndex = 0

      const fullRows = images.map((img, i) => ({
        product_id: product.id,
        url: img.url,
        display_order: i,
        is_primary: i === primaryIndex,
        colour: img.colour?.trim() || null,
        is_colour_primary: !!img.is_colour_primary
      }))

      const { error: imgErr } = await supabase.from('product_images').insert(fullRows)
      if (imgErr) {
        const baseRows = fullRows.map(({ colour, is_colour_primary, ...base }) => base)
        await supabase.from('product_images').insert(baseRows)
      }
    }

    if (collection_ids.length) await supabase.from('collection_products').insert(collection_ids.map((collection_id, display_order) => ({ collection_id, product_id: product.id, display_order })))

    // Insert Variants via authoritative reconciler
    if (variants && variants.length > 0) {
      await reconcileProductVariants(supabase, product.id, variants, { productSlug: slug })
    }
  }

  await revalidateCatalogPaths(slug)
  revalidatePath('/seller/products')
  if (finalProductId) {
    revalidatePath(`/seller/products/${finalProductId}`)
    revalidatePath(`/seller/products/${finalProductId}/edit`)
  }
  return { id: finalProductId }
}

/**
 * Dedicated server action to quickly update variant inventory for sellers.
 * Bypasses the full product edit lifecycle to allow instant stock updates without review resets.
 */
export async function updateSellerVariantInventory(variantId: string, quantity: number) {
  const isAdmin = await checkIsAdmin()
  const seller = !isAdmin ? await getMySellerRecord() : await getPlatformSellerRecord()
  if (!isAdmin && (!seller || seller.seller_status !== 'approved')) {
    throw new Error('Unauthorized: You must have an active seller account.')
  }

  const adminSupabase = getAdminSupabase()

  // Verify the variant exists and check ownership if not admin
  const { data: variant, error: varError } = await adminSupabase
    .from('product_variants')
    .select('id, products!inner(seller_id, slug)')
    .eq('id', variantId)
    .single()

  if (varError || !variant) {
    throw new Error('Variant not found.')
  }

  if (!isAdmin && seller && (variant.products as any).seller_id !== seller.id) {
    throw new Error('Unauthorized: You can only modify your own variants.')
  }

  const qty = Math.max(0, Number(quantity))

  // Upsert inventory
  const { data: invRow } = await adminSupabase
    .from('inventory')
    .select('id')
    .eq('variant_id', variantId)
    .single()

  if (invRow) {
    const { error } = await adminSupabase
      .from('inventory')
      .update({ quantity: qty, updated_at: new Date().toISOString() })
      .eq('variant_id', variantId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await adminSupabase
      .from('inventory')
      .insert({ variant_id: variantId, quantity: qty, low_stock_threshold: 5 })
    if (error) throw new Error(error.message)
  }

  // Recalculate total active inventory for the product and sync is_sold_out
  const productId = (variant as any).product_id || (variant.products as any)?.id
  if (productId) {
    const { data: activeVars } = await adminSupabase
      .from('product_variants')
      .select('id, inventory(quantity)')
      .eq('product_id', productId)
      .eq('is_active', true)

    const totalStock = (activeVars || []).reduce((sum: number, v: any) => {
      const q = Array.isArray(v.inventory) ? v.inventory[0]?.quantity : v.inventory?.quantity
      return sum + Number(q || 0)
    }, 0)

    const shouldBeSoldOut = totalStock === 0
    await adminSupabase
      .from('products')
      .update({ is_sold_out: shouldBeSoldOut, updated_at: new Date().toISOString() })
      .eq('id', productId)
  }

  const slug = (variant.products as any)?.slug
  await revalidateCatalogPaths(slug)
  revalidatePath('/seller/products')
  revalidatePath('/admin/products')
  if (slug) {
    revalidatePath(`/products/${slug}`)
  }
  
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
  const seller = await getMySellerRecord()
  if (!seller) return []

  // CRITICAL FIX: Bypass the restrictive 'orders_customer_select' RLS policy
  // which prevents sellers from reading customer orders they didn't personally place.
  // We MUST rigorously enforce seller scoping here server-side.
  const adminSupabase = getAdminSupabase()

  const { data, error } = await adminSupabase
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
  const seller = await getMySellerRecord()
  if (!seller) return null

  // Enforce server-side isolation and bypass restrictive customer RLS on orders table
  const adminSupabase = getAdminSupabase()

  const { data, error } = await adminSupabase
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
    .eq('seller_id', seller.id) // Security: Ensure this specific seller owns this order item
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
  const orderItemId = String(formData.get('orderItemId') || '')
  const status = String(formData.get('status') || 'unfulfilled')
  const trackingNumber = String(formData.get('trackingNumber') || '')
  const carrier = String(formData.get('carrier') || '')
  const estimatedDeliveryDate = String(formData.get('estimatedDeliveryDate') || '')

  await updateFulfillmentStatus(orderItemId, status, trackingNumber, carrier, estimatedDeliveryDate)
}

export async function updateFulfillmentStatus(
  orderItemId: string,
  status: string,
  tracking: string,
  carrier: string,
  estimatedDeliveryDate?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Authentication required. Please log in.')
  }

  const isAdmin = await checkIsAdmin()
  const seller = await getMySellerRecord()

  if (!isAdmin && (!seller || seller.seller_status !== 'approved')) {
    throw new Error('Unauthorized: No active approved seller account.')
  }

  const cleanItemId = String(orderItemId || '').trim()
  if (!cleanItemId) {
    throw new Error('Order item ID is required.')
  }

  const cleanStatus = String(status || '').trim()
  const allowedStatuses = [
    'unfulfilled',
    'processing',
    'dispatched',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned',
    'delivery_failed'
  ]
  if (!allowedStatuses.includes(cleanStatus)) {
    throw new Error(`Invalid fulfillment status: "${cleanStatus}". Supported: ${allowedStatuses.join(', ')}`)
  }

  const cleanTracking = String(tracking || '').trim()
  const cleanCarrier = String(carrier || '').trim()

  const adminSupabase = getAdminSupabase()

  // 1. Authoritative lookup of existing order item
  const { data: existingItem, error: fetchErr } = await adminSupabase
    .from('order_items')
    .select('id, seller_id, order_id, fulfillment_status')
    .eq('id', cleanItemId)
    .maybeSingle()

  if (fetchErr || !existingItem) {
    throw new Error('Order item record not found.')
  }

  // 2. Strict seller ownership verification: Sellers can only update their own items
  if (!isAdmin && seller && existingItem.seller_id !== seller.id) {
    throw new Error('Unauthorized: You cannot modify order items belonging to another merchant.')
  }

  // 3. Prepare payload
  const updatePayload: Record<string, any> = {
    fulfillment_status: cleanStatus,
    tracking_number: cleanTracking || null,
    carrier: cleanCarrier || null,
    updated_at: new Date().toISOString()
  }

  if (estimatedDeliveryDate !== undefined && estimatedDeliveryDate !== null && estimatedDeliveryDate !== '') {
    try {
      updatePayload.estimated_delivery_date = new Date(estimatedDeliveryDate).toISOString()
    } catch {
      // keep null or omit
    }
  }

  if (cleanStatus === 'delivered') {
    updatePayload.delivered_at = new Date().toISOString()
  } else if (cleanStatus === 'in_transit' || cleanStatus === 'dispatched') {
    updatePayload.in_transit_at = new Date().toISOString()
  }

  // 4. Authoritative update using adminSupabase (guaranteeing trigger safety and no RLS disconnect)
  const { data: updatedItem, error: updateErr } = await adminSupabase
    .from('order_items')
    .update(updatePayload)
    .eq('id', cleanItemId)
    .select('id, order_id, fulfillment_status, tracking_number, carrier, estimated_delivery_date')
    .single()

  if (updateErr) {
    console.error('[Fulfillment] Error updating order item:', updateErr)
    throw new Error(updateErr.message || 'Failed to persist fulfillment details.')
  }

  // 5. Non-blocking notifications: Failure must never reverse successful DB update
  notifyOrderItemFulfillmentChanged(cleanItemId, cleanStatus, cleanTracking, cleanCarrier).catch(notifErr => {
    console.warn('[Fulfillment] Notification dispatch error (non-fatal):', notifErr)
  })

  // 6. Cache revalidations
  revalidatePath('/seller/orders')
  revalidatePath('/seller/dashboard')
  revalidatePath('/admin/orders')
  revalidatePath('/account')
  revalidatePath(`/seller/orders/${cleanItemId}`)
  if (existingItem.order_id) {
    revalidatePath(`/admin/orders/${existingItem.order_id}`)
    revalidatePath(`/account/orders/${existingItem.order_id}`)
    revalidatePath(`/account/orders/${existingItem.order_id}/track`)
  }

  return {
    success: true,
    item: updatedItem
  }
}

export async function cancelAndRefundOrderItemAction(orderItemId: string, reason: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Authentication required.')

  const isAdmin = await checkIsAdmin()
  const seller = await getMySellerRecord()
  if (!isAdmin && (!seller || seller.seller_status !== 'approved')) {
    throw new Error('Unauthorized: No active seller account.')
  }

  const adminSupabase = getAdminSupabase()
  const { data: item } = await adminSupabase
    .from('order_items')
    .select('id, seller_id, order_id')
    .eq('id', orderItemId)
    .maybeSingle()

  if (!item) throw new Error('Order item not found.')
  if (!isAdmin && seller && item.seller_id !== seller.id) {
    throw new Error('Unauthorized: You cannot cancel orders belonging to another merchant.')
  }

  // 1. Call RPC to initiate cancellation and idempotently get refund_event_id
  const { data: cancelRes, error: cancelError } = await adminSupabase.rpc('cancel_paid_order_item', {
    p_order_item_id: orderItemId,
    p_seller_id: item.seller_id,
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
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('Razorpay credentials are not configured.')
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
            seller_id: seller?.id || item.seller_id
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

/**
 * Update the is_sold_out override for a specific product.
 */
export async function setProductSoldOutAction(productId: string, isSoldOut: boolean): Promise<void> {
  const isAdmin = await checkIsAdmin()
  const seller = !isAdmin ? await getMySellerRecord() : await getPlatformSellerRecord()
  
  if (!isAdmin && (!seller || seller.seller_status !== 'approved')) {
    throw new Error('Unauthorized: You must have an active seller account.')
  }

  const adminSupabase = getAdminSupabase()

  // Authoritative validation of ownership
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, seller_id, slug')
    .eq('id', productId)
    .maybeSingle()

  if (fetchError || !product) {
    throw new Error('Product not found.')
  }

  if (!isAdmin && seller && product.seller_id !== seller.id) {
    throw new Error('Unauthorized: You can only modify your own products.')
  }
  
  const { error: updateError } = await adminSupabase
    .from('products')
    .update({ is_sold_out: isSoldOut })
    .eq('id', productId)

  if (updateError) {
    throw new Error(`Failed to update product state: ${updateError.message}`)
  }

  revalidatePath('/seller/products')
  revalidatePath('/admin/products')
  if (product.slug) {
    revalidatePath(`/products/${product.slug}`)
  }
}

/**
 * Attempt to delete a product. If historical commerce dependencies exist, safely archive it instead.
 */
export async function deleteProductAction(productId: string): Promise<{ deleted: boolean, archived: boolean }> {
  const isAdmin = await checkIsAdmin()
  const seller = !isAdmin ? await getMySellerRecord() : await getPlatformSellerRecord()
  
  if (!isAdmin && (!seller || seller.seller_status !== 'approved')) {
    throw new Error('Unauthorized: You must have an active seller account.')
  }

  const adminSupabase = getAdminSupabase()

  // 1. Authoritative validation of product existence
  const { data: product, error: fetchError } = await adminSupabase
    .from('products')
    .select('id, seller_id, slug, name')
    .eq('id', productId)
    .maybeSingle()

  if (fetchError || !product) {
    throw new Error('Product not found.')
  }

  // 2. Strict seller isolation: normal seller can only delete their own products
  if (!isAdmin && seller && product.seller_id !== seller.id) {
    throw new Error('Unauthorized: You can only delete your own products.')
  }

  // 3. Dependency Audit: check if product is referenced in historical orders
  const { data: orderItems, error: oiError } = await adminSupabase
    .from('order_items')
    .select('id')
    .eq('product_id', productId)
    .limit(1)

  const hasDependencies = Boolean(orderItems && orderItems.length > 0)

  if (hasDependencies) {
    // Historical commerce records exist. Archive instead of hard delete.
    const { error: archiveError } = await adminSupabase
      .from('products')
      .update({ is_active: false })
      .eq('id', productId)
      
    if (archiveError) {
      throw new Error(`Failed to archive product: ${archiveError.message}`)
    }

    revalidatePath('/seller/products')
    revalidatePath('/admin/products')
    invalidateProductCache(product.slug)
    if (product.slug) {
      revalidatePath(`/products/${product.slug}`)
    }
    return { deleted: false, archived: true }
  }

  // 4. Safe to hard delete: no historical order dependencies
  const { error: deleteError } = await adminSupabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (deleteError) {
    // If a foreign key restriction occurs, fallback to safe archival
    if (deleteError.code === '23503') { // foreign_key_violation
      await adminSupabase.from('products').update({ is_active: false }).eq('id', productId)
      revalidatePath('/seller/products')
      revalidatePath('/admin/products')
      invalidateProductCache(product.slug)
      if (product.slug) {
        revalidatePath(`/products/${product.slug}`)
      }
      return { deleted: false, archived: true }
    }
    throw new Error(`Failed to delete product: ${deleteError.message}`)
  }

  revalidatePath('/seller/products')
  revalidatePath('/admin/products')
  invalidateProductCache(product.slug)
  if (product.slug) {
    revalidatePath(`/products/${product.slug}`)
  }
  return { deleted: true, archived: false }
}

export async function getSellerProductRevisionDetails(productId: string) {
  const seller = await getMySellerRecord()
  if (!seller) return null
  const supabase = await createClient()

  const cleanId = (productId || '').trim()
  if (!cleanId) return null

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      seller_id,
      approval_status,
      rejection_reason,
      price,
      compare_at_price,
      created_at,
      updated_at,
      details,
      categories(id, name, slug),
      product_images(id, url, is_primary, display_order)
    `)
    .eq('id', cleanId)
    .eq('seller_id', seller.id)
    .maybeSingle()

  if (error || !product) {
    return null
  }

  const feedback = parseRevisionFeedback(product.rejection_reason, product.details)
  const history = extractRevisionHistory(product.details)

  return {
    product,
    feedback,
    history
  }
}

