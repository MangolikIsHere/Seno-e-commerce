import { supabase } from './supabase'
import { cache } from 'react'

export type Category = 'Ethnic & Traditional Wear' | 'Western' | 'Topwear' | 'Bottomwear' | 'Cosmetics' | string

export interface Variant {
  id: string
  size: string
  colour: string
  sku: string
  priceOverride?: number
  weightGramsOverride?: number
  inventoryQuantity: number
}

export interface ReturnPolicy {
  isReturnable: boolean
  returnWindowDays: number
  returnPolicyNotes?: string
}

export function parseReturnPolicy(details: any): ReturnPolicy {
  if (Array.isArray(details)) {
    const obj = details.find(d => typeof d === 'object' && d !== null && (d.is_returnable !== undefined || d.__return_policy !== undefined))
    if (obj) {
      const rp = obj.__return_policy || obj
      return {
        isReturnable: rp.is_returnable ?? true,
        returnWindowDays: Number(rp.return_window_days ?? 14),
        returnPolicyNotes: rp.notes || ''
      }
    }
    const str = details.find(d => typeof d === 'string' && d.toLowerCase().startsWith('return policy:'))
    if (str) {
      const lower = str.toLowerCase()
      if (lower.includes('non-returnable') || lower.includes('final sale') || lower.includes('not eligible')) {
        return { isReturnable: false, returnWindowDays: 0, returnPolicyNotes: 'Final Sale — Non-Returnable' }
      }
      const match = str.match(/(\d+)\s*day/i)
      return { isReturnable: true, returnWindowDays: match ? parseInt(match[1], 10) : 14, returnPolicyNotes: '' }
    }
  } else if (typeof details === 'object' && details !== null) {
    const rp = details.return_policy || details
    if (rp.is_returnable !== undefined) {
      return {
        isReturnable: rp.is_returnable ?? true,
        returnWindowDays: Number(rp.return_window_days ?? 14),
        returnPolicyNotes: rp.notes || ''
      }
    }
  }
  return {
    isReturnable: true,
    returnWindowDays: 14,
    returnPolicyNotes: 'Standard 14-day return window. Garments must be unworn with original tags.'
  }
}

export interface Product {
  id: string
  seller_id: string
  category_id?: string
  slug: string
  name: string
  category: Category
  description: string
  details?: string[]
  returnPolicy?: ReturnPolicy
  price: number
  compareAtPrice?: number
  defaultWeightGrams: number
  shippingMethod: 'weight_based' | 'custom'
  customDeliveryCharge?: number
  image: string
  hoverImage: string
  images: string[]
  sizes: string[]
  colors: string[]
  color: string
  variants: Variant[]
  soldOut?: boolean
  isNew?: boolean
  isBestseller?: boolean
  isSale?: boolean
  createdAt: string
}

export const money = (n: number) => `₹${n.toLocaleString('en-IN')}`

const img = (path: string) => `https://images.unsplash.com/${path}?auto=format&fit=crop&w=1000&q=85`
const fallbackImg = img('photo-1551028719-00167b16eac5')

export function getPrimaryProductImage(row: any): string {
  const images = Array.isArray(row?.product_images)
    ? [...row.product_images].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    : []
  const imageUrl = images.map((image: any) => image.url || image.image_url).find(Boolean)
  return imageUrl || row?.image || row?.images?.[0] || fallbackImg
}

function mapProductRow(row: any): Product {
  const pImages = row.product_images || []
  const sortedImages = [...pImages].sort((a: any, b: any) => a.display_order - b.display_order)
  const imageUrls = sortedImages.map((image: any) => image.url || image.image_url).filter(Boolean)
  const image = getPrimaryProductImage(row)
  const hoverImage = imageUrls.length > 1 ? imageUrls[1] : image

  const rawVariants = row.product_variants || []
  const variants: Variant[] = rawVariants
    .filter((v: any) => v.is_active)
    .map((v: any) => ({
      id: v.id,
      size: v.size || '',
      colour: v.colour || '',
      sku: v.sku,
      priceOverride: v.price_override ? Number(v.price_override) : undefined,
      weightGramsOverride: v.weight_grams_override ? Number(v.weight_grams_override) : undefined,
      inventoryQuantity: (() => {
        if (v.inventory) {
          if (Array.isArray(v.inventory)) {
            if (v.inventory.length > 0 && v.inventory[0]?.quantity !== undefined && v.inventory[0]?.quantity !== null) {
              const q = Number(v.inventory[0].quantity)
              return isNaN(q) ? 10 : q
            }
          } else if (v.inventory.quantity !== undefined && v.inventory.quantity !== null) {
            const q = Number(v.inventory.quantity)
            return isNaN(q) ? 10 : q
          }
        }
        return 10
      })(),
    }))

  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[]
  const colors = Array.from(new Set(variants.map(v => v.colour).filter(Boolean))) as string[]
  const color = colors.length > 0 ? colors[0] : 'Default'
  
  const totalInventory = variants.reduce((sum: number, v: Variant) => sum + v.inventoryQuantity, 0)
  const soldOut = row.is_sold_out || (totalInventory === 0 && variants.length > 0)

  const returnPolicy = parseReturnPolicy(row.details)
  const cleanDetails = Array.isArray(row.details)
    ? row.details.filter((d: any) => typeof d === 'string' && !d.toLowerCase().startsWith('return policy:'))
    : []

  return {
    id: row.id,
    seller_id: row.seller_id,
    category_id: row.category_id,
    slug: row.slug,
    name: row.name,
    category: row.categories?.name || '',
    description: row.description || '',
    details: cleanDetails,
    returnPolicy,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    defaultWeightGrams: Number(row.default_weight_grams),
    shippingMethod: row.shipping_method === 'custom' ? 'custom' : 'weight_based',
    customDeliveryCharge: row.custom_delivery_charge == null ? undefined : Number(row.custom_delivery_charge),
    image,
    hoverImage,
    images: imageUrls.length > 0 ? imageUrls : [fallbackImg],
    sizes: sizes.length > 0 ? sizes : ['One size'],
    colors,
    color,
    variants,
    soldOut,
    isNew: row.is_new,
    isBestseller: row.is_bestseller,
    isSale: !!row.compare_at_price && Number(row.compare_at_price) > Number(row.price),
    createdAt: row.created_at,
  }
}

const selectQuery = `
  *,
  categories!inner(name, slug, is_active),
  product_images(url, is_primary, display_order),
  product_variants(id, size, colour, sku, price_override, weight_grams_override, is_active, inventory(quantity))
`

export const getProduct = cache(async (slug: string): Promise<Product | undefined> => {
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('categories.is_active', true)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .single()
    
  if (error || !data) return undefined
  return mapProductRow(data)
})

export const getRelatedProducts = async (product: Product, limit = 4): Promise<Product[]> => {
  let matchedRows: any[] = []

  // If product has a category_id, fetch related products from the same category first
  if (product.category_id) {
    const { data: catData } = await supabase
      .from('products')
      .select(selectQuery)
      .eq('categories.is_active', true)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .eq('category_id', product.category_id)
      .neq('slug', product.slug)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (catData) {
      matchedRows = [...catData]
    }
  }

  // If fewer than limit, backfill with other approved active products
  if (matchedRows.length < limit) {
    const remaining = limit - matchedRows.length
    const existingIds = [product.id, ...matchedRows.map((p: any) => p.id)]

    let fallbackQuery = supabase
      .from('products')
      .select(selectQuery)
      .eq('categories.is_active', true)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .neq('slug', product.slug)

    if (existingIds.length > 0) {
      fallbackQuery = fallbackQuery.not('id', 'in', `(${existingIds.join(',')})`)
    }

    const { data: fallbackData } = await fallbackQuery
      .order('created_at', { ascending: false })
      .limit(remaining)

    if (fallbackData) {
      matchedRows = [...matchedRows, ...fallbackData]
    }
  }

  return matchedRows.map(mapProductRow)
}

export const getNewArrivals = async (limit = 4): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('categories.is_active', true)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .eq('is_new', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(mapProductRow)
}

export const getBestsellers = async (limit = 4): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('categories.is_active', true)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .eq('is_bestseller', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(mapProductRow)
}

export const getCollectionProducts = async (
  category: string,
  options?: {
    availability?: string
    size?: string
    color?: string
    sort?: string
    query?: string
  }
): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('categories.is_active', true)
    .eq('is_active', true)
    .eq('approval_status', 'approved')

  if (error || !data) return []

  let list = data.map(mapProductRow)

  if (category && category !== 'All' && category !== 'All products' && category !== '' && category !== 'all') {
    const normalizedCategory = category.toLowerCase()
    if (normalizedCategory === 'new arrivals' || normalizedCategory === 'new-arrivals') {
       list = list.filter(p => p.isNew)
    } else if (normalizedCategory === 'bestsellers') {
       list = list.filter(p => p.isBestseller)
    } else {
       list = list.filter(p => p.category.toLowerCase() === normalizedCategory)
    }
  }

  if (options?.availability && options.availability !== 'All') {
    if (options.availability === 'In stock') list = list.filter(p => !p.soldOut)
    if (options.availability === 'Sold out') list = list.filter(p => p.soldOut)
  }

  if (options?.size && options.size !== 'All') {
    list = list.filter(p => p.sizes.includes(options.size!))
  }

  if (options?.color && options.color !== 'All') {
    list = list.filter(p => p.color.toLowerCase() === options.color!.toLowerCase())
  }

  if (options?.query && options.query.trim() !== '') {
    const q = options.query.toLowerCase().trim()
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    )
  }

  if (options?.sort) {
    if (options.sort === 'Newest') {
      list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (options.sort === 'Price: low to high') {
      list = [...list].sort((a, b) => a.price - b.price)
    } else if (options.sort === 'Price: high to low') {
      list = [...list].sort((a, b) => b.price - a.price)
    } else if (options.sort === 'Best selling') {
      list = [...list].sort((a, b) => (b.isBestseller ? 1 : 0) - (a.isBestseller ? 1 : 0))
    }
  }

  return list
}

export const searchProducts = async (queryStr: string, limit?: number): Promise<Product[]> => {
  const cleanQuery = queryStr.trim().toLowerCase()
  if (!cleanQuery) return []

  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('categories.is_active', true)
    .eq('is_active', true)
    .eq('approval_status', 'approved')

  if (error || !data) return []
  const allProducts = data.map(mapProductRow)
  const terms = cleanQuery.split(/\s+/).filter(Boolean)

  const matches = allProducts.filter(p => {
    const searchableText = [
      p.name,
      p.description,
      p.category,
      ...(p.colors || []),
      ...(p.sizes || []),
      ...(p.variants?.map(v => `${v.sku} ${v.colour} ${v.size}`) || []),
      ...(p.details || [])
    ].join(' ').toLowerCase()

    return terms.every(term => {
      if (searchableText.includes(term)) return true

      // Singular/plural stemming
      if (term.endsWith('s') && searchableText.includes(term.slice(0, -1))) return true
      if (term.endsWith('es') && searchableText.includes(term.slice(0, -2))) return true
      if (!term.endsWith('s') && (searchableText.includes(`${term}s`) || searchableText.includes(`${term}es`))) return true

      // Common apparel synonym mappings
      if (term === 'pants' && searchableText.includes('pant')) return true
      if (term === 'pant' && searchableText.includes('pants')) return true
      if (term === 'trousers' && searchableText.includes('trouser')) return true
      if (term === 'trouser' && searchableText.includes('trousers')) return true
      if (term === 'tee' && (searchableText.includes('t-shirt') || searchableText.includes('shirt') || searchableText.includes('tank'))) return true

      return false
    })
  })

  return limit ? matches.slice(0, limit) : matches
}

export const getProductsBySlugs = async (slugs: string[]): Promise<Product[]> => {
  if (!slugs || slugs.length === 0) return []
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('categories.is_active', true)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .in('slug', slugs)
    
  if (error || !data) return []
  return data.map(mapProductRow)
}
