export const SITE_URL = 'https://www.seno.co.in'
export const SITE_NAME = 'SENO'
export const DEFAULT_TITLE = 'SENO — Considered Clothing & Objects'
export const DEFAULT_DESCRIPTION =
  "Considered clothing and objects for a life in motion. Discover SENO's collection of contemporary clothing and everyday essentials."
export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/seno-mark-512.png`

/**
 * Returns an absolute canonical URL using the production domain https://www.seno.co.in
 */
export function getCanonicalUrl(path: string = ''): string {
  if (!path || path === '/') {
    return `${SITE_URL}/`
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${cleanPath}`
}

/**
 * Schema.org WebSite structured data for Google Site Name discovery
 */
export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SENO',
  url: 'https://www.seno.co.in/',
  alternateName: ['SENO'],
}
