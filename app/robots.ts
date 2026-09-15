import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seno-luxury.com'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/cart',
        '/checkout',
        '/checkout/*',
        '/account',
        '/account/*',
        '/seller',
        '/seller/*',
        '/admin',
        '/admin/*',
        '/api/*'
      ]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  }
}
