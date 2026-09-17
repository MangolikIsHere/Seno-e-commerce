'use server'

import { createClient } from '@/utils/supabase/server'
import { checkIsAdmin } from '@/lib/admin'
import { revalidatePath } from 'next/cache'
import fs from 'fs'
import path from 'path'

export interface AdminProductImage {
  id?: string
  url: string
  alt_text?: string
  display_order: number
  is_primary: boolean
}

export interface AdminProductVariant {
  id?: string
  size: string
  colour: string
  sku: string
  price_override?: number | null
  weight_grams_override?: number | null
  quantity: number
  is_active: boolean
}

export interface CreateProductInput {
  name: string
  slug?: string
  description: string
  details?: string[]
  price: number
  compare_at_price?: number | null
  category_id?: string | null
  collection_ids?: string[]
  default_weight_grams: number
  shipping_method?: 'weight_based' | 'custom'
  custom_delivery_charge?: number | null
  is_featured?: boolean
  is_new?: boolean
  is_bestseller?: boolean
  is_active?: boolean
  images: AdminProductImage[]
  variants: AdminProductVariant[]
}

export interface UpdateProductInput extends CreateProductInput {
  id: string
}

/**
 * Revalidate all storefront routes that depend on the catalog.
 */
export async function revalidateCatalogPaths(slug?: string) {
  try {
    revalidatePath('/')
    revalidatePath('/products')
    revalidatePath('/collections/[category]', 'page')
    revalidatePath('/collections/all')
    revalidatePath('/search')
    revalidatePath('/admin/products')
    if (slug) {
      revalidatePath(`/products/${slug}`)
    }
  } catch (err) {
    console.warn('Revalidation warning:', err)
  }
}

/**
 * Generate a clean, URL-safe slug from a string.
 */
export async function slugify(text: string): Promise<string> {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function internalSlugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a guaranteed unique slug for a product.
 */
export async function generateUniqueSlug(name: string, currentProductId?: string): Promise<string> {
  const supabase = await createClient()
  const baseSlug = internalSlugify(name) || 'product'
  let candidate = baseSlug
  let counter = 1

  while (true) {
    let query = supabase
      .from('products')
      .select('id')
      .eq('slug', candidate)

    if (currentProductId) {
      query = query.neq('id', currentProductId)
    }

    const { data } = await query
    if (!data || data.length === 0) {
      return candidate
    }

    counter++
    candidate = `${baseSlug}-${counter}`
  }
}

/**
 * Fetch metadata needed for product creation (categories & collections).
 */
export async function getCatalogMetadata() {
  const supabase = await createClient()

  const [catRes, colRes] = await Promise.all([
    supabase.from('categories').select('*').eq('is_active', true).order('display_order', { ascending: true }),
    supabase.from('collections').select('*').eq('is_active', true).order('name', { ascending: true })
  ])

  return {
    categories: catRes.data || [],
    collections: colRes.data || []
  }
}

/**
 * Fetch all catalog products for the admin panel with full variant and inventory details.
 */
export async function getAdminCatalogProducts(filters?: {
  query?: string
  categoryId?: string
  status?: string // 'all' | 'active' | 'inactive' | 'approved' | 'submitted' | 'rejected' | 'low_stock' | 'sold_out'
  sort?: string
}) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const query = supabase
    .from('products')
    .select(`
      *,
      categories(id, name, slug),
      sellers(id, store_name, seller_type),
      product_images(id, url, alt_text, display_order, is_primary),
      product_variants(
        id, size, colour, sku, price_override, weight_grams_override, is_active,
        inventory(id, quantity, low_stock_threshold)
      ),
      collection_products(collection_id, collections(id, name, slug))
    `)
    .order('created_at', { ascending: false })

  if (filters?.categoryId && filters.categoryId !== 'all') {
    query.eq('category_id', filters.categoryId)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching admin products:', error)
    throw new Error(error.message)
  }

  let products = (data || []).map((p: any) => {
    const rawVariants = p.product_variants || []
    const variants = rawVariants.map((v: any) => {
      let qty = 10
      if (v.inventory) {
        if (Array.isArray(v.inventory) && v.inventory.length > 0) {
          qty = Number(v.inventory[0]?.quantity ?? 0)
        } else if (v.inventory.quantity !== undefined) {
          qty = Number(v.inventory.quantity ?? 0)
        }
      }
      return {
        ...v,
        quantity: isNaN(qty) ? 0 : qty
      }
    })

    const totalStock = variants.reduce((sum: number, v: any) => sum + (v.is_active ? v.quantity : 0), 0)
    const isSoldOut = variants.length > 0 && totalStock === 0
    const isLowStock = variants.some((v: any) => v.is_active && v.quantity > 0 && v.quantity <= 5)

    const images = (p.product_images || []).sort((a: any, b: any) => a.display_order - b.display_order)
    const primaryImage = images.find((img: any) => img.is_primary)?.url || images[0]?.url || '/placeholder.png'

    return {
      ...p,
      variants,
      totalStock,
      isSoldOut,
      isLowStock,
      primaryImage,
      images
    }
  })

  // In-memory filter for text query
  if (filters?.query && filters.query.trim()) {
    const q = filters.query.toLowerCase().trim()
    products = products.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.categories?.name?.toLowerCase().includes(q) ||
      p.variants.some((v: any) => v.sku.toLowerCase().includes(q))
    )
  }

  // Filter by status
  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'active') {
      products = products.filter((p: any) => p.is_active)
    } else if (filters.status === 'inactive') {
      products = products.filter((p: any) => !p.is_active)
    } else if (filters.status === 'approved') {
      products = products.filter((p: any) => p.approval_status === 'approved')
    } else if (filters.status === 'submitted') {
      products = products.filter((p: any) => p.approval_status === 'submitted')
    } else if (filters.status === 'rejected') {
      products = products.filter((p: any) => p.approval_status === 'rejected')
    } else if (filters.status === 'sold_out') {
      products = products.filter((p: any) => p.isSoldOut)
    } else if (filters.status === 'low_stock') {
      products = products.filter((p: any) => p.isLowStock)
    }
  }

  return products
}

/**
 * Fetch a single product by ID for editing.
 */
export async function getAdminProductById(id: string) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(id, name, slug),
      product_images(id, url, alt_text, display_order, is_primary),
      product_variants(
        id, size, colour, sku, price_override, weight_grams_override, is_active,
        inventory(id, quantity, low_stock_threshold)
      ),
      collection_products(collection_id)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  const variants = (data.product_variants || []).map((v: any) => {
    let qty = 10
    if (v.inventory) {
      if (Array.isArray(v.inventory) && v.inventory.length > 0) {
        qty = Number(v.inventory[0]?.quantity ?? 0)
      } else if (v.inventory.quantity !== undefined) {
        qty = Number(v.inventory.quantity ?? 0)
      }
    }
    return {
      id: v.id,
      size: v.size || '',
      colour: v.colour || '',
      sku: v.sku,
      price_override: v.price_override ? Number(v.price_override) : null,
      weight_grams_override: v.weight_grams_override ? Number(v.weight_grams_override) : null,
      quantity: isNaN(qty) ? 0 : qty,
      is_active: v.is_active
    }
  })

  const images = (data.product_images || [])
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((img: any) => ({
      id: img.id,
      url: img.url,
      alt_text: img.alt_text || '',
      display_order: img.display_order,
      is_primary: img.is_primary
    }))

  const collectionIds = (data.collection_products || []).map((cp: any) => cp.collection_id)

  return {
    ...data,
    variants,
    images,
    collection_ids: collectionIds
  }
}

/**
 * Create a new product as a platform admin.
 */
export async function createAdminProduct(input: CreateProductInput) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized: only SENO administrators can create products.')

  if (!input.name || !input.name.trim()) throw new Error('Product name is required.')
  if (input.price === undefined || input.price === null || Number(input.price) < 0) {
    throw new Error('Valid price is required.')
  }
  const shippingMethod = input.shipping_method === 'custom' ? 'custom' : 'weight_based'
  const customDeliveryCharge = input.custom_delivery_charge == null ? null : Number(input.custom_delivery_charge)
  if (shippingMethod === 'custom' && (customDeliveryCharge === null || !Number.isFinite(customDeliveryCharge) || customDeliveryCharge < 0)) throw new Error('A non-negative custom delivery charge is required.')

  // 1. Resolve Platform Seller ID
  let platformSellerId = 'fb09c575-2d0c-48d8-b1ff-b7a1ead8407a'
  const { data: sellerRow } = await supabase
    .from('sellers')
    .select('id')
    .eq('seller_type', 'platform')
    .limit(1)
    .single()

  if (sellerRow?.id) {
    platformSellerId = sellerRow.id
  }

  // 2. Generate clean unique slug
  const finalSlug = input.slug?.trim()
    ? internalSlugify(input.slug.trim())
    : await generateUniqueSlug(input.name)

  // Verify slug uniqueness
  const { data: existingSlug } = await supabase
    .from('products')
    .select('id')
    .eq('slug', finalSlug)
    .single()

  if (existingSlug) {
    throw new Error(`The slug "${finalSlug}" is already taken. Please choose another.`)
  }

  // 3. Insert Product
  const productPayload: any = {
    seller_id: platformSellerId,
    category_id: input.category_id || null,
    name: input.name.trim(),
    slug: finalSlug,
    description: input.description || '',
    details: input.details || [],
    price: Number(input.price),
    compare_at_price: input.compare_at_price ? Number(input.compare_at_price) : null,
    default_weight_grams: Number(input.default_weight_grams || 500),
    shipping_method: shippingMethod,
    custom_delivery_charge: shippingMethod === 'custom' ? customDeliveryCharge : null,
    is_featured: !!input.is_featured,
    is_new: input.is_new !== undefined ? !!input.is_new : true,
    is_bestseller: !!input.is_bestseller,
    is_active: input.is_active !== undefined ? !!input.is_active : true,
    approval_status: 'approved',
    published_at: new Date().toISOString()
  }

  const { data: newProduct, error: prodErr } = await supabase
    .from('products')
    .insert(productPayload)
    .select()
    .single()

  if (prodErr || !newProduct) {
    console.error('Failed to insert product:', prodErr)
    throw new Error(prodErr?.message || 'Failed to create product record.')
  }

  const productId = newProduct.id

  // 4. Associate Collections
  if (input.collection_ids && input.collection_ids.length > 0) {
    const cpRows = input.collection_ids.map((collId, idx) => ({
      collection_id: collId,
      product_id: productId,
      display_order: idx
    }))
    await supabase.from('collection_products').insert(cpRows)
  }

  // 5. Insert Images
  if (input.images && input.images.length > 0) {
    const hasExplicitPrimary = input.images.some(img => img.is_primary)
    const imgRows = input.images.map((img, idx) => ({
      product_id: productId,
      url: img.url,
      alt_text: img.alt_text || input.name,
      display_order: idx,
      is_primary: hasExplicitPrimary ? !!img.is_primary : idx === 0
    }))
    await supabase.from('product_images').insert(imgRows)
  }

  // 6. Insert Variants & Inventory
  if (input.variants && input.variants.length > 0) {
    for (let i = 0; i < input.variants.length; i++) {
      const v = input.variants[i]
      const varSku = v.sku?.trim() || `${finalSlug.toUpperCase()}-${internalSlugify(v.size || 'STD').toUpperCase()}-${internalSlugify(v.colour || 'DEF').toUpperCase()}`

      const { data: newVariant, error: varErr } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          size: v.size || null,
          colour: v.colour || null,
          sku: varSku,
          price_override: v.price_override ? Number(v.price_override) : null,
          weight_grams_override: v.weight_grams_override ? Number(v.weight_grams_override) : null,
          is_active: v.is_active !== undefined ? v.is_active : true
        })
        .select()
        .single()

      if (newVariant?.id) {
        // Insert inventory
        await supabase.from('inventory').insert({
          variant_id: newVariant.id,
          quantity: Math.max(0, Number(v.quantity || 0)),
          low_stock_threshold: 5
        })
      }
    }
  }

  await revalidateCatalogPaths(finalSlug)
  return { success: true, product: newProduct }
}

/**
 * Update an existing product.
 */
export async function updateAdminProduct(id: string, input: UpdateProductInput) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized: only SENO administrators can edit products.')

  if (!input.name || !input.name.trim()) throw new Error('Product name is required.')
  if (input.price === undefined || input.price === null || Number(input.price) < 0) {
    throw new Error('Valid price is required.')
  }
  const shippingMethod = input.shipping_method === 'custom' ? 'custom' : 'weight_based'
  const customDeliveryCharge = input.custom_delivery_charge == null ? null : Number(input.custom_delivery_charge)
  if (shippingMethod === 'custom' && (customDeliveryCharge === null || !Number.isFinite(customDeliveryCharge) || customDeliveryCharge < 0)) throw new Error('A non-negative custom delivery charge is required.')

  // 1. Slug check
  let finalSlug = internalSlugify(input.slug?.trim() || input.name)
  const { data: existingSlug } = await supabase
    .from('products')
    .select('id')
    .eq('slug', finalSlug)
    .neq('id', id)
    .single()

  if (existingSlug) {
    finalSlug = await generateUniqueSlug(input.name, id)
  }

  // 2. Update Product attributes
  const updates: any = {
    category_id: input.category_id || null,
    name: input.name.trim(),
    slug: finalSlug,
    description: input.description || '',
    details: input.details || [],
    price: Number(input.price),
    compare_at_price: input.compare_at_price ? Number(input.compare_at_price) : null,
    default_weight_grams: Number(input.default_weight_grams || 500),
    shipping_method: shippingMethod,
    custom_delivery_charge: shippingMethod === 'custom' ? customDeliveryCharge : null,
    is_featured: !!input.is_featured,
    is_new: !!input.is_new,
    is_bestseller: !!input.is_bestseller,
    is_active: input.is_active !== undefined ? !!input.is_active : true,
    updated_at: new Date().toISOString()
  }

  const { error: prodErr } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)

  if (prodErr) {
    console.error('Failed to update product:', prodErr)
    throw new Error(prodErr.message)
  }

  // 3. Sync Collections
  await supabase.from('collection_products').delete().eq('product_id', id)
  if (input.collection_ids && input.collection_ids.length > 0) {
    const cpRows = input.collection_ids.map((collId, idx) => ({
      collection_id: collId,
      product_id: id,
      display_order: idx
    }))
    await supabase.from('collection_products').insert(cpRows)
  }

  // 4. Sync Images
  // Clean existing images and replace with edited set to guarantee order and primary flag
  await supabase.from('product_images').delete().eq('product_id', id)
  if (input.images && input.images.length > 0) {
    const hasExplicitPrimary = input.images.some(img => img.is_primary)
    const imgRows = input.images.map((img, idx) => ({
      product_id: id,
      url: img.url,
      alt_text: img.alt_text || input.name,
      display_order: idx,
      is_primary: hasExplicitPrimary ? !!img.is_primary : idx === 0
    }))
    await supabase.from('product_images').insert(imgRows)
  }

  // 5. Sync Variants & Inventory
  if (input.variants) {
    // Process each variant: update existing or insert new
    for (const v of input.variants) {
      if (v.id) {
        // Update variant
        await supabase
          .from('product_variants')
          .update({
            size: v.size || null,
            colour: v.colour || null,
            sku: v.sku,
            price_override: v.price_override ? Number(v.price_override) : null,
            weight_grams_override: v.weight_grams_override ? Number(v.weight_grams_override) : null,
            is_active: v.is_active !== undefined ? v.is_active : true,
            updated_at: new Date().toISOString()
          })
          .eq('id', v.id)

        // Upsert inventory
        const qty = Math.max(0, Number(v.quantity || 0))
        const { data: invRow } = await supabase.from('inventory').select('id').eq('variant_id', v.id).single()
        if (invRow) {
          await supabase.from('inventory').update({ quantity: qty, updated_at: new Date().toISOString() }).eq('variant_id', v.id)
        } else {
          await supabase.from('inventory').insert({ variant_id: v.id, quantity: qty, low_stock_threshold: 5 })
        }
      } else {
        // New variant added during edit
        const varSku = v.sku?.trim() || `${finalSlug.toUpperCase()}-${internalSlugify(v.size || 'STD').toUpperCase()}-${internalSlugify(v.colour || 'DEF').toUpperCase()}`
        const { data: newVar } = await supabase
          .from('product_variants')
          .insert({
            product_id: id,
            size: v.size || null,
            colour: v.colour || null,
            sku: varSku,
            price_override: v.price_override ? Number(v.price_override) : null,
            weight_grams_override: v.weight_grams_override ? Number(v.weight_grams_override) : null,
            is_active: v.is_active !== undefined ? v.is_active : true
          })
          .select()
          .single()

        if (newVar?.id) {
          await supabase.from('inventory').insert({
            variant_id: newVar.id,
            quantity: Math.max(0, Number(v.quantity || 0)),
            low_stock_threshold: 5
          })
        }
      }
    }
  }

  await revalidateCatalogPaths(finalSlug)
  return { success: true }
}

/**
 * Toggle product active status (Deactivate / Reactivate).
 */
export async function toggleProductActive(id: string, is_active: boolean) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const { data: product, error } = await supabase
    .from('products')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('slug')
    .single()

  if (error) throw new Error(error.message)

  await revalidateCatalogPaths(product?.slug)
  return { success: true, is_active }
}

/**
 * Quick update inventory quantity for a variant.
 */
export async function updateVariantInventory(variantId: string, quantity: number) {
  const supabase = await createClient()
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) throw new Error('Unauthorized')

  const qty = Math.max(0, Number(quantity))

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

  // Get product slug for revalidation
  const { data: variant } = await supabase
    .from('product_variants')
    .select('products(slug)')
    .eq('id', variantId)
    .single()

  const slug = (variant?.products as any)?.slug
  await revalidateCatalogPaths(slug)
  return { success: true, quantity: qty }
}

/**
 * Handle image upload directly to Supabase Storage with local fallback.
 */
export async function uploadImageAction(formData: FormData): Promise<{ url: string; error?: string }> {
  const file = formData.get('file') as File | null
  if (!file) {
    return { url: '', error: 'No image file provided' }
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { url: '', error: 'Image size exceeds 5MB limit' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { url: '', error: 'Unsupported file format. Please upload JPG, PNG, WEBP, or AVIF.' }
  }

  const supabase = await createClient()
  const buffer = Buffer.from(await file.arrayBuffer())
  const cleanExt = path.extname(file.name) || '.jpg'
  const cleanBase = path.basename(file.name, cleanExt).replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `${Date.now()}_${cleanBase}${cleanExt}`
  const storagePath = `catalog/${fileName}`

  // 1. Attempt Supabase Storage Upload
  try {
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true
      })

    if (!uploadErr && uploadData) {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath)

      if (urlData?.publicUrl) {
        return { url: urlData.publicUrl }
      }
    }
  } catch (err) {
    console.warn('Supabase storage upload attempt encountered error:', err)
  }

  // 2. Local fallback storage (/public/uploads/products) if storage bucket is not active
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    const localFilePath = path.join(uploadDir, fileName)
    fs.writeFileSync(localFilePath, buffer)
    return { url: `/uploads/products/${fileName}` }
  } catch (err: any) {
    console.error('Local fallback upload failed:', err)
    return { url: '', error: 'Failed to store image' }
  }
}
