export const SITE_URL = 'https://www.seno.co.in'
export const SITE_NAME = 'SENO'
export const DEFAULT_TITLE = 'SENO — Considered Clothing & Objects'
export const DEFAULT_DESCRIPTION =
  "Considered clothing and objects for a life in motion. Discover SENO's collection of contemporary clothing and everyday essentials."
export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/seno-mark-512.png`
export const GOOGLE_SITE_VERIFICATION = 'Tz05-jzj2ZcGfXgRVxWFUjHHTcIpmB36_ACRq0AGbLc'

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
  alternateName: ['SENO', 'SENO Studio', 'SENO India'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://www.seno.co.in/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

/**
 * Schema.org Organization structured data for brand knowledge graph
 */
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SENO',
  legalName: 'SENO',
  url: 'https://www.seno.co.in',
  logo: `${SITE_URL}/brand/seno-mark-512.png`,
  description: 'Considered clothing and objects for everyday life in motion. Modern silhouettes, elevated craft, and sustainable textiles.',
  sameAs: [
    'https://www.instagram.com/souravsaha887/',
    'https://www.facebook.com/sourav.saha.585585',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-8617648031',
    contactType: 'customer support',
    areaServed: 'IN',
    availableLanguage: ['en', 'hi'],
  },
}

/**
 * Generates Schema.org BreadcrumbList structured data
 */
export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url.startsWith('/') ? item.url : `/${item.url}`}`,
    })),
  }
}
