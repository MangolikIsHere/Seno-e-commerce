import { supabase } from './supabase'

export type Category = 'Topwear' | 'Bottomwear' | 'Outerwear' | 'Accessories' | string

export interface Product {
  id: string
  slug: string
  name: string
  category: Category
  description: string
  details?: string[]
  price: number
  compareAtPrice?: number
  image: string
  hoverImage: string
  images: string[]
  sizes: string[]
  colors: string[]
  color: string
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
  const imageUrls = sortedImages.map((img: any) => img.image_url)
  const image = imageUrls.length > 0 ? imageUrls[0] : fallbackImg
  const hoverImage = imageUrls.length > 1 ? imageUrls[1] : image

  const variants = row.product_variants || []
  const sizes = Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))) as string[]
  const colors = Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))) as string[]
  const color = colors.length > 0 ? colors[0] : 'Default'
  
  const totalInventory = variants.reduce((sum: number, v: any) => sum + (v.inventory_count || 0), 0)
  const soldOut = totalInventory === 0 && variants.length > 0

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.categories?.name || 'Uncategorized',
    description: row.description || '',
    details: row.details || [],
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : undefined,
    image,
    hoverImage,
    images: imageUrls.length > 0 ? imageUrls : [fallbackImg],
    sizes: sizes.length > 0 ? sizes : ['One size'],
    colors,
    color,
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
  product_images(image_url, is_primary, display_order),
  product_variants(size, color, inventory_count)
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
  if (!queryStr.trim()) return []
  
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .or(`name.ilike.%${queryStr}%,description.ilike.%${queryStr}%`)
    
  if (error || !data) return []
  let list = data.map(mapProductRow)
  if (limit) {
    list = list.slice(0, limit)
  }
  return list
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
