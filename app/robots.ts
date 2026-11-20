import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const privateDisallows = [
    '/cart',
    '/checkout',
    '/checkout/*',
    '/account',
    '/account/*',
    '/seller',
    '/seller/*',
    '/admin',
    '/admin/*',
    '/api/*',
    '/auth/*',
    '/search',
    '/wishlist',
    '/offline',
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: privateDisallows,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: privateDisallows,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
