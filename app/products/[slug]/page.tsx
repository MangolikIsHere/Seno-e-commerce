import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCachedProduct, getCachedRelatedProducts, getAllProductSlugs } from '@/lib/catalog-server'
import { ProductDetailClient } from '@/components/ProductDetailClient'
import { getActivePromotions } from '@/lib/promotions'
import { isProductEligibleForPromotion } from '@/lib/promotions-shared'
import { SITE_URL, SITE_NAME } from '@/lib/seo'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs()
  return slugs.map((slug) => ({ slug }))
}

function toAbsoluteUrl(url?: string | null): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return `${SITE_URL}/brand/seno-mark-512.png`
  }
  const clean = url.trim()
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean
  }
  return `${SITE_URL}${clean.startsWith('/') ? clean : `/${clean}`}`
}

function cleanProductDescription(desc?: string | null): string {
  if (!desc || typeof desc !== 'string') {
    return 'Considered clothing and objects for everyday life. Explore this product at SENO.'
  }
  const stripped = desc
    .replace(/<[^>]*>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .trim()
  return stripped || 'Considered clothing and objects for everyday life. Explore this product at SENO.'
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getCachedProduct(slug)

  if (!product) {
    return {
      title: 'Product Not Found — SENO',
      description: 'The requested piece was not found in the SENO luxury catalog.',
    }
  }

  const productUrl = `${SITE_URL}/products/${product.slug}`
  const primaryImage = product.images[0] || product.image
  const absoluteImageUrl = toAbsoluteUrl(primaryImage)
  const cleanDesc = cleanProductDescription(product.description)
  const shortDesc = cleanDesc.length > 160 ? `${cleanDesc.slice(0, 157)}...` : cleanDesc

  const metaTitle = `${product.name} | SENO`

  return {
    title: metaTitle,
    description: shortDesc,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: metaTitle,
      description: cleanDesc,
      url: productUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: `${product.name} — SENO Luxury`,
          type: 'image/jpeg',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: metaTitle,
      description: shortDesc,
      images: [absoluteImageUrl],
    },
    other: {
      'product:price:amount': String(product.price),
      'product:price:currency': 'INR',
      'product:availability': product.soldOut ? 'out of stock' : 'in stock',
      'product:condition': 'new',
      'product:brand': 'SENO',
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getCachedProduct(slug)

  if (!product) {
    notFound()
  }

  const [activePromotions, relatedProducts] = await Promise.all([
    getActivePromotions(),
    getCachedRelatedProducts(product, 4),
  ])
  const applicablePromotion = activePromotions.find(promo => isProductEligibleForPromotion(product, promo)) || null

  // Schema.org Product Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.variants[0]?.sku || product.slug,
    brand: {
      '@type': 'Brand',
      name: 'SENO',
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.soldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'SENO',
      },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
        slug={slug}
        applicablePromotion={applicablePromotion}
      />
    </>
  )
}
