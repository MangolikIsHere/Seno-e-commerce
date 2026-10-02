import { unstable_cache, updateTag, revalidateTag } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getProduct, getRelatedProducts, Product } from '@/lib/catalog'

/**
 * Retrieves all approved, active product slugs for static route generation.
 */
export async function getAllProductSlugs(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true)
      .eq('approval_status', 'approved')

    if (error || !data) return []
    return data.map((p: { slug: string }) => p.slug).filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Server-cached product retriever with cross-request data caching.
 */
export async function getCachedProduct(slug: string): Promise<Product | undefined> {
  const fetcher = unstable_cache(
    async (s: string) => getProduct(s),
    ['seno-product-detail'],
    { revalidate: 300, tags: ['products', `product-${slug}`] }
  )
  return fetcher(slug)
}

/**
 * Server-cached related products retriever.
 */
export async function getCachedRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const fetcher = unstable_cache(
    async (productId: string, catId: string, pSlug: string, lim: number) => {
      return getRelatedProducts({ ...product, id: productId, category_id: catId, slug: pSlug }, lim)
    },
    ['seno-related-products'],
    { revalidate: 300, tags: ['products', `related-${product.id}`] }
  )
  return fetcher(product.id, product.category_id || '', product.slug, limit)
}

/**
 * Invalidate product cache tags across Server Actions and Route Handlers.
 */
export function invalidateProductCache(slug?: string) {
  try {
    updateTag('products')
  } catch {
    try {
      revalidateTag('products', 'seconds')
    } catch {
      // outside request context
    }
  }

  if (slug) {
    try {
      updateTag(`product-${slug}`)
    } catch {
      try {
        revalidateTag(`product-${slug}`, 'seconds')
      } catch {
        // outside request context
      }
    }
  }
}
