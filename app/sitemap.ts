import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/seo'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date().toISOString()

  // 1. Static Public Storefront Canonical Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/collections/all`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/collections/new-arrivals`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/collections/bestsellers`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/offers`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/shipping`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/returns`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/return-refund-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/cancellation-policy`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/install`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/contact-developer`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // 2. Active Category Routes with at least 1 published product
  let categoryRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: activeCategories } = await supabase
      .from('categories')
      .select('id, slug, is_active')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (activeCategories && activeCategories.length > 0) {
      for (const cat of activeCategories) {
        // Confirm category has active, approved products to prevent Soft 404
        const { count } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id)
          .eq('is_active', true)
          .eq('approval_status', 'approved')

        if (count && count > 0) {
          categoryRoutes.push({
            url: `${SITE_URL}/collections/${cat.slug}`,
            lastModified: currentDate,
            changeFrequency: 'daily',
            priority: 0.8,
          })
        }
      }
    }
  } catch (err) {
    console.error('[Sitemap] Error fetching categories:', err)
  }

  // 3. Active Promotional Offers
  let offerRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: activePromotions } = await supabase
      .from('promotions')
      .select('slug, updated_at')
      .eq('is_active', true)

    if (activePromotions && activePromotions.length > 0) {
      offerRoutes = activePromotions.map((p) => ({
        url: `${SITE_URL}/offers/${p.slug}`,
        lastModified: p.updated_at || currentDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      }))
    }
  } catch (err) {
    console.error('[Sitemap] Error fetching active promotions:', err)
  }

  // 4. Approved, Active Public Product Routes
  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .order('updated_at', { ascending: false })

    if (products && products.length > 0) {
      productRoutes = products.map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastModified: p.updated_at || currentDate,
        changeFrequency: 'daily',
        priority: 0.8,
      }))
    }
  } catch (err) {
    console.error('[Sitemap] Error fetching products:', err)
  }

  return [...staticRoutes, ...categoryRoutes, ...offerRoutes, ...productRoutes]
}
