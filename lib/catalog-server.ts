import { cache } from 'react'
import { unstable_cache, updateTag, revalidateTag } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { getProduct, getRelatedProducts, getNewArrivals, getBestsellers, Product } from '@/lib/catalog'

/**
 * Retrieves all approved, active product slugs for static route generation.
 */
export const getAllProductSlugs = cache(async (): Promise<string[]> => {
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
})

/**
 * Module-level Next.js Data Cache wrapper for product details.
 * Cached cross-request for 300s, tagged with 'products'.
 */
const fetchProductCached = unstable_cache(
  async (slug: string) => {
    return getProduct(slug)
  },
  ['seno-product-detail-cache'],
  { revalidate: 300, tags: ['products'] }
)

/**
 * Request-deduplicated and cross-request cached product retriever.
 * React cache() ensures generateMetadata and ProductPage share the exact same promise.
 */
export const getCachedProduct = cache(async (slug: string): Promise<Product | undefined> => {
  if (!slug) return undefined
  try {
    return await fetchProductCached(slug)
  } catch {
    return getProduct(slug)
  }
})

/**
 * Module-level Next.js Data Cache wrapper for related products.
 */
const fetchRelatedProductsCached = unstable_cache(
  async (productId: string, catId: string, pSlug: string, limit: number) => {
    return getRelatedProducts({ id: productId, category_id: catId, slug: pSlug } as any, limit)
  },
  ['seno-related-products-cache'],
  { revalidate: 300, tags: ['products'] }
)

/**
 * Server-cached related products retriever.
 */
export const getCachedRelatedProducts = cache(async (product: Product, limit = 4): Promise<Product[]> => {
  if (!product?.id) return []
  try {
    return await fetchRelatedProductsCached(product.id, product.category_id || '', product.slug, limit)
  } catch {
    return getRelatedProducts(product, limit)
  }
})

/**
 * Module-level Next.js Data Cache wrapper for new arrivals (homepage).
 */
const fetchNewArrivalsCached = unstable_cache(
  async (limit: number) => {
    return getNewArrivals(limit)
  },
  ['seno-new-arrivals-cache'],
  { revalidate: 300, tags: ['products'] }
)

export const getCachedNewArrivals = cache(async (limit = 8): Promise<Product[]> => {
  try {
    return await fetchNewArrivalsCached(limit)
  } catch {
    return getNewArrivals(limit)
  }
})

/**
 * Module-level Next.js Data Cache wrapper for bestsellers (homepage).
 */
const fetchBestsellersCached = unstable_cache(
  async (limit: number) => {
    return getBestsellers(limit)
  },
  ['seno-bestsellers-cache'],
  { revalidate: 300, tags: ['products'] }
)

export const getCachedBestsellers = cache(async (limit = 8): Promise<Product[]> => {
  try {
    return await fetchBestsellersCached(limit)
  } catch {
    return getBestsellers(limit)
  }
})

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
