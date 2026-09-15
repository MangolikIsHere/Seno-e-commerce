import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProduct, getRelatedProducts } from '@/lib/catalog'
import { ProductDetailClient } from '@/components/ProductDetailClient'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return {
      title: 'Product Not Found — SENO',
      description: 'The requested piece was not found in the SENO luxury catalog.'
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seno-luxury.com'
  const productUrl = `${siteUrl}/products/${product.slug}`
  const primaryImage = product.images[0] || product.image

  return {
    title: `${product.name} — SENO`,
    description: product.description.slice(0, 160),
    alternates: {
      canonical: productUrl
    },
    openGraph: {
      title: `${product.name} — SENO`,
      description: product.description,
      url: productUrl,
      siteName: 'SENO Luxury Marketplace',
      images: [
        {
          url: primaryImage,
          width: 1000,
          height: 1333,
          alt: product.name
        }
      ],
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — SENO`,
      description: product.description.slice(0, 160),
      images: [primaryImage]
    }
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(product, 4)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seno-luxury.com'

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
      name: 'SENO'
    },
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}/products/${product.slug}`,
      priceCurrency: 'INR',
      price: product.price,
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.soldOut
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'SENO'
      }
    }
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
      />
    </>
  )
}
