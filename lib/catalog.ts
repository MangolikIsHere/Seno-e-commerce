import { supabase } from './supabase'

export type Category = 'Topwear' | 'Bottomwear' | 'Outerwear' | 'Accessories' | string

export interface Variant {
  id: string
  size: string
  colour: string
  sku: string
  priceOverride?: number
  weightGramsOverride?: number
  inventoryQuantity: number
}

export interface Product {
  id: string
  seller_id: string
  slug: string
  name: string
  category: Category
  description: string
  details?: string[]
  price: number
  compareAtPrice?: number
  defaultWeightGrams: number
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

function mapProductRow(row: any): Product {
  const pImages = row.product_images || []
  const sortedImages = [...pImages].sort((a: any, b: any) => a.display_order - b.display_order)
  const imageUrls = sortedImages.map((img: any) => img.url || img.image_url)
  const image = imageUrls.length > 0 ? imageUrls[0] : fallbackImg
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
      inventoryQuantity: v.inventory ? Number(v.inventory.quantity) : 0,
    }))

  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[]
  const colors = Array.from(new Set(variants.map(v => v.colour).filter(Boolean))) as string[]
  const color = colors.length > 0 ? colors[0] : 'Default'
  
  const totalInventory = variants.reduce((sum: number, v: Variant) => sum + v.inventoryQuantity, 0)
  const soldOut = totalInventory === 0 && variants.length > 0

  return {
    id: row.id,
    seller_id: row.seller_id,
    slug: row.slug,
    name: row.name,
    category: row.categories?.name || 'Uncategorized',
    description: row.description || '',
    details: row.details || [],
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    defaultWeightGrams: Number(row.default_weight_grams),
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
  categories(name),
  product_images(url, is_primary, display_order),
  product_variants(id, size, colour, sku, price_override, weight_grams_override, is_active, inventory(quantity))
`

export const getProduct = async (slug: string): Promise<Product | undefined> => {
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .single()
    
  if (error || !data) return undefined
  return mapProductRow(data)
}

export const getRelatedProducts = async (product: Product, limit = 4): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .neq('slug', product.slug)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []
  return data.map(mapProductRow)
}

export const getNewArrivals = async (limit = 4): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
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
    .eq('is_active', true)
    .eq('approval_status', 'approved')

  if (error || !data) return []

  let list = data.map(mapProductRow)

  if (category && category !== 'All' && category !== 'All products' && category !== '' && category !== 'all') {
    if (category === 'New arrivals' || category === 'new-arrivals') {
       list = list.filter(p => p.isNew)
    } else if (category === 'Bestsellers' || category === 'bestsellers') {
       list = list.filter(p => p.isBestseller)
    } else {
       list = list.filter(p => p.category.toLowerCase() === category.toLowerCase())
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
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .in('slug', slugs)
    
  if (error || !data) return []
  return data.map(mapProductRow)
}
