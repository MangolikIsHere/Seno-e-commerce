import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Tag, Clock, ShieldCheck, Sparkles, Check } from 'lucide-react'
import { getPromotionBySlug, getEligibleProductsForPromotion, getEffectivePromotionStatus } from '@/lib/promotions'
import { getPromotionBadgeText } from '@/lib/promotions-shared'
import { ProductCard } from '@/components/ProductCard'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const revalidate = 60

interface OfferDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: OfferDetailPageProps): Promise<Metadata> {
  const { slug } = await params
  const promo = await getPromotionBySlug(slug)

  if (!promo || getEffectivePromotionStatus(promo) !== 'active') {
    return {
      title: 'Offer Not Found | SENO',
      robots: { index: false, follow: false }
    }
  }

  const title = `${promo.name} — Offers`
  const description = promo.description || `Shop eligible products for ${promo.name} at SENO.`
  const canonicalUrl = `${SITE_URL}/offers/${slug}`

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title: `${title} | SENO`,
      description,
      url: canonicalUrl,
      images: promo.hero_image_url ? [{ url: promo.hero_image_url }] : [{ url: DEFAULT_OG_IMAGE }]
    }
  }
}

export default async function OfferDetailPage({ params }: OfferDetailPageProps) {
  const { slug } = await params
  const promo = await getPromotionBySlug(slug)

  if (!promo || getEffectivePromotionStatus(promo) !== 'active') {
    notFound()
  }

  const eligibleProducts = await getEligibleProductsForPromotion(promo)
  const badgeText = getPromotionBadgeText(promo)

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: promo.name,
    description: promo.description || `Eligible products for ${promo.name}`,
    numberOfItems: eligibleProducts.length,
    itemListElement: eligibleProducts.map((product, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        url: `${SITE_URL}/products/${product.slug}`,
        image: product.image,
        offers: {
          '@type': 'Offer',
          priceCurrency: 'INR',
          price: product.price,
          availability: product.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
        }
      }
    }))
  }

  return (
    <main className="static-page-container" style={{ paddingBottom: '90px' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <Link
        href="/offers"
        className="breadcrumb-back-link"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '24px' }}
      >
        <ArrowLeft size={13} /> ALL OFFERS
      </Link>

      {/* Hero / Header Header */}
      <div
        style={{
          borderBottom: '1px solid var(--border)',
          paddingBottom: '32px',
          marginBottom: '36px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span
            style={{
              background: 'var(--ink)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1.2px',
              padding: '4px 9px',
              borderRadius: '2px',
              textTransform: 'uppercase'
            }}
          >
            {badgeText}
          </span>

          {promo.coupon_code && (
            <span
              style={{
                background: '#f5f5f5',
                border: '1px dashed #999',
                fontSize: '10.5px',
                fontFamily: 'monospace',
                padding: '3px 8px',
                borderRadius: '2px',
                letterSpacing: '0.8px'
              }}
            >
              USE CODE: {promo.coupon_code}
            </span>
          )}
        </div>

        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            fontWeight: 400,
            color: 'var(--ink)',
            margin: '0 0 12px',
            lineHeight: 1.2
          }}
        >
          {promo.hero_headline || promo.name}
        </h1>

        <p style={{ color: 'var(--muted)', fontSize: '15px', maxWidth: '720px', lineHeight: 1.6, margin: 0 }}>
          {promo.description || 'Eligible styles curated for this exclusive promotion.'}
        </p>

        {/* Promotion Condition Badges */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '20px',
            fontSize: '12px',
            color: 'var(--ink)'
          }}
        >
          {promo.min_cart_value ? (
            <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '2px' }}>
              <strong>Minimum Spend:</strong> ₹{promo.min_cart_value.toLocaleString('en-IN')}
            </div>
          ) : null}

          {promo.min_quantity ? (
            <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '2px' }}>
              <strong>Minimum Quantity:</strong> {promo.min_quantity} items
            </div>
          ) : null}

          {promo.max_discount_amount ? (
            <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '2px' }}>
              <strong>Maximum Discount Cap:</strong> ₹{promo.max_discount_amount.toLocaleString('en-IN')}
            </div>
          ) : null}

          {promo.ends_at ? (
            <div style={{ background: '#fff9e6', border: '1px solid #ffe082', color: '#8a6d3b', padding: '6px 12px', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} />
              <span>Valid until {new Date(promo.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Eligible Product Grid */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)' }}>
          ELIGIBLE STYLES ({eligibleProducts.length})
        </span>
      </div>

      {eligibleProducts.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '3px' }}>
          <Tag size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: 'var(--ink)', margin: '0 0 8px' }}>
            No products currently match this promotion.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '20px' }}>
            Check back soon as items are refreshed.
          </p>
          <Link href="/collections/all" className="dark-btn" style={{ padding: '12px 24px', fontSize: '11px' }}>
            VIEW ALL PRODUCTS
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '24px 16px'
          }}
        >
          {eligibleProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              promotionBadge={badgeText}
              returnContext={`/offers/${slug}`}
            />
          ))}
        </div>
      )}
    </main>
  )
}
