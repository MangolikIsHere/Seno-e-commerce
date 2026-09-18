import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seno-luxury.com'
  const currentDate = new Date().toISOString()
  const { data: activeCategories } = await supabase
    .from('categories')
    .select('slug')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  // 1. Static Storefront Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0
    },
    {
      url: `${siteUrl}/collections/all`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${siteUrl}/collections/new-arrivals`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${siteUrl}/collections/bestsellers`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8
    },
    {
      url: `${siteUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5
    },
    {
      url: `${siteUrl}/journal`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4
    },
    {
      url: `${siteUrl}/shipping`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.4
    }
  ]

  const categoryRoutes: MetadataRoute.Sitemap = (activeCategories || []).map(category => ({
    url: `${siteUrl}/collections/${category.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly',
    priority: 0.8
  }))

  // 2. Database-backed Public Product Routes
  try {
    const { data: products } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true)
      .eq('approval_status', 'approved')

    if (products && products.length > 0) {
      const productRoutes: MetadataRoute.Sitemap = products.map(p => ({
        url: `${siteUrl}/products/${p.slug}`,
        lastModified: p.updated_at || currentDate,
        changeFrequency: 'weekly',
        priority: 0.8
      }))

      return [...staticRoutes, ...categoryRoutes, ...productRoutes]
    }
  } catch {
    // If DB query fails during build time, return static routes fallback
  }

  return staticRoutes
}
