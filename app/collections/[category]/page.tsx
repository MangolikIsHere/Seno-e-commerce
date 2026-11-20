import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CollectionView } from '@/components/CollectionView'
import { getActiveCategories } from '@/lib/categories'
import { getCollectionProducts, Product } from '@/lib/catalog'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, buildBreadcrumbJsonLd } from '@/lib/seo'

interface PageProps {
  params: Promise<{ category: string }>
}

const SYSTEM_CATEGORIES = new Set(['all', 'new-arrivals', 'bestsellers'])

function getCategoryMeta(slug: string, matchedName?: string) {
  const metaMap: Record<string, { title: string; description: string }> = {
    all: {
      title: 'Complete Collection',
      description: 'Explore the complete SENO catalog of contemporary silhouettes and considered objects.'
    },
    topwear: {
      title: 'Topwear Collection',
      description: 'Shirts, overshirts, and tees crafted from structured organic cotton and linen.'
    },
    bottomwear: {
      title: 'Bottomwear Collection',
      description: 'Pleated trousers, denim, and relaxed trousers designed for effortless everyday motion.'
    },
    'ethnic-traditional-wear': {
      title: 'Ethnic & Traditional Wear',
      description: 'Heritage silhouettes and modern craft from the current SENO catalog.'
    },
    western: {
      title: 'Western Collection',
      description: 'Contemporary everyday forms from the current SENO catalog.'
    },
    cosmetics: {
      title: 'Cosmetics Collection',
      description: 'Beauty, care, and finishing touches from the current SENO catalog.'
    },
    accessories: {
      title: 'Accessories & Jewellery',
      description: 'Discover elegant gold-plated jewellery and everyday accessories that complete your look.'
    },
    'new-arrivals': {
      title: 'New Arrivals',
      description: 'Discover the latest additions to the SENO seasonal collection.'
    },
    bestsellers: {
      title: 'Bestselling Pieces',
      description: 'The most appreciated garments and objects in the SENO marketplace.'
    }
  }

  if (metaMap[slug]) return metaMap[slug]

  const titleName = matchedName || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    title: `${titleName} Collection`,
    description: `Explore ${titleName} at SENO — considered clothing and everyday objects.`
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.category.toLowerCase()

  const [categories, products] = await Promise.all([
    getActiveCategories().catch(() => []),
    getCollectionProducts(slug, { sort: 'Featured' }).catch(() => [])
  ])

  const matched = categories.find((c) => c.slug.toLowerCase() === slug)
  const isSystemCategory = SYSTEM_CATEGORIES.has(slug)

  // 1. Genuine 404 for non-existent categories
  if (!matched && !isSystemCategory) {
    notFound()
  }

  const meta = getCategoryMeta(slug, matched?.name)
  const canonicalUrl = `${SITE_URL}/collections/${slug}`
  const ogTitle = `${meta.title} — SENO`

  // 2. Prevent Soft 404 if category exists in DB but currently has 0 approved products
  const hasProducts = products.length > 0
  const robotsDirective = hasProducts
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large' as const,
          'max-snippet': -1,
        },
      }
    : {
        index: false,
        follow: true,
      }

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: robotsDirective,
    openGraph: {
      title: ogTitle,
      description: meta.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'website',
      images: [
        {
          url: matched?.image_url || DEFAULT_OG_IMAGE,
          width: 512,
          height: 512,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: meta.description,
      images: [matched?.image_url || DEFAULT_OG_IMAGE],
    },
  }
}

export async function generateStaticParams() {
  try {
    const categories = await getActiveCategories()
    const slugs = Array.from(new Set([...SYSTEM_CATEGORIES, ...categories.map(c => c.slug.toLowerCase())]))
    return slugs.map(category => ({ category }))
  } catch {
    return Array.from(SYSTEM_CATEGORIES).map(category => ({ category }))
  }
}

export const dynamic = 'auto'
export const dynamicParams = true
export const revalidate = 60

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.category.toLowerCase()

  const [categories, initialProducts] = await Promise.all([
    getActiveCategories(),
    getCollectionProducts(slug, { sort: 'Featured' })
  ])

  const matched = categories.find((category) => category.slug.toLowerCase() === slug)
  const isSystemCategory = SYSTEM_CATEGORIES.has(slug)

  // Genuinely return 404 for unrecognized collections
  if (!matched && !isSystemCategory) {
    notFound()
  }

  let title = matched?.name.toUpperCase() || 'ALL PRODUCTS'
  if (slug === 'new-arrivals') {
    title = 'NEW ARRIVALS'
  } else if (slug === 'bestsellers') {
    title = 'BESTSELLERS'
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListElement: initialProducts.map((p: Product, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: p.name,
      url: `${SITE_URL}/products/${p.slug}`,
    })),
  }

  const breadcrumbsJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
    { name: title, url: `/collections/${slug}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <CollectionView
        categoryTitle={title}
        categorySlug={slug}
        categoryOptions={categories.map((category) => category.name)}
        initialProducts={initialProducts}
        categoryBanner={matched?.image_url}
        categoryDescription={matched?.description}
      />
    </>
  )
}
