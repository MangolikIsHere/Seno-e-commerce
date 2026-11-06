import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { AtelierTrustBar } from '@/components/AtelierTrustBar'
import { ProductCard } from '@/components/ProductCard'
import { ProductCarousel } from '@/components/ProductCarousel'
import { SenoImage } from '@/components/SenoImage'
import { getCollectionProducts } from '@/lib/catalog'
import { getCachedNewArrivals, getCachedBestsellers } from '@/lib/catalog-server'
import { getActiveCategories } from '@/lib/categories'
import { getActivePromotions } from '@/lib/promotions'
import { isProductEligibleForPromotion, getPromotionBadgeText } from '@/lib/promotions-shared'
import { HeroCarousel } from '@/components/HeroCarousel'
import { getCachedActiveHeroSlides } from '@/lib/hero-slides'
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  GOOGLE_SITE_VERIFICATION,
  websiteJsonLd,
} from '@/lib/seo'

export const revalidate = 300

export const metadata: Metadata = {
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
  },
  title: {
    absolute: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: {
    canonical: `${SITE_URL}/`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_IN',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 512,
        height: 512,
        alt: DEFAULT_TITLE,
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
}

export default async function HomePage() {
  let categoryFetchError: string | null = null

  const [newArrivals, bestsellers, cosmeticsProducts, activePromotions, heroSlides, categoriesResult] = await Promise.all([
    getCachedNewArrivals(8),
    getCachedBestsellers(8),
    getCollectionProducts('cosmetics', { sort: 'Newest' }).then(p => p.slice(0, 8)),
    getActivePromotions(),
    getCachedActiveHeroSlides(),
    getActiveCategories().catch(err => {
      categoryFetchError = err?.message || 'Database error'
      console.error('[HomePage] Non-critical category fetch notice:', err?.message || err)
      return []
    }),
  ])

  const categories = categoriesResult || []
  const featuredPromotions = activePromotions
    .filter(promo => promo.show_on_homepage_hero)
    .slice(0, 4)

  function getProductBadge(product: any): string | undefined {
    for (const promo of activePromotions) {
      if (isProductEligibleForPromotion(promo, product)) {
        return getPromotionBadgeText(promo)
      }
    }
    return undefined
  }

  const promotionBadges: Record<string, string | undefined> = {}
  for (const product of [...newArrivals, ...bestsellers, ...cosmeticsProducts]) {
    promotionBadges[product.id] = getProductBadge(product)
  }

    const categoryPresentation: Record<string, { subtitle: string; tag: string; tagColor: string; tagBg: string; className ?: string }> = {
      'ethnic-traditional-wear': {
        subtitle: 'Heritage silhouettes & artisanal craft',
        tag: 'HERITAGE CRAFT',
        tagColor: 'var(--terracotta)',
        tagBg: 'var(--terracotta-soft)',
        className: 'category-tile-feature'
    },
      western: {
        subtitle: 'Contemporary silhouettes & modern tailoring',
        tag: 'CONTEMPORARY',
        tagColor: 'var(--deep-blue)',
        tagBg: 'var(--deep-blue-soft)',
        className: 'category-tile-feature'
    },
      topwear: {
      subtitle: 'Shirts, tees & elevated essentials',
        tag: 'ELEVATED ESSENTIALS',
        tagColor: 'var(--sage-green)',
        tagBg: 'var(--sage-green-soft)'
    },
      bottomwear: {
      subtitle: 'Denim, trousers & modern separates',
        tag: 'ARCHITECTURAL SEPARATES',
        tagColor: 'var(--charcoal)',
        tagBg: 'var(--charcoal-soft)'
    },
      cosmetics: {
      subtitle: 'Beauty, care & finishing touches',
        tag: 'THE BEAUTY EDIT',
        tagColor: 'var(--dusty-rose)',
        tagBg: 'var(--dusty-rose-soft)'
    },
      accessories: {
      subtitle: 'Gold-plated jewellery & finishing accents',
        tag: 'GOLD ACCENTS',
        tagColor: 'var(--champagne-gold)',
        tagBg: 'var(--champagne-soft)'
    }
    }

  const categoryTiles = categories.map(category => {
    const meta = categoryPresentation[category.slug] || {
      subtitle: category.description || 'Explore the current SENO collection.',
      tag: 'CURATED CAPSULE',
      tagColor: 'var(--champagne-gold)',
      tagBg: 'var(--champagne-soft)'
    }
    return {
      title: category.name.toUpperCase(),
      subtitle: meta.subtitle,
      tag: meta.tag,
      tagColor: meta.tagColor,
      tagBg: meta.tagBg,
      image: category.image_url || '/placeholder.jpg',
      href: `/collections/${category.slug}`,
      className: meta.className
    }
  })

  return (
    <div className="homepage-storefront">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      {/* 1. HERO CAROUSEL */}
      <HeroCarousel slides={heroSlides} featuredPromotions={featuredPromotions} />

      {/* 1b. ATELIER TRUST & CRAFT STRIP */}
      <AtelierTrustBar />

      {/* 2. NEW ARRIVALS */}
      <section className="section-padding" id="new-arrivals">
        <div className="section-header-flex">
          <div>
            <span className="section-kicker" style={{ color: 'var(--sage-green)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--sage-green)', display: 'inline-block' }}></span>
              CURATED RELEASES
            </span>
            <h2 className="section-title">New Arrivals</h2>
          </div>
          <Link href="/collections/new-arrivals" className="view-all-link">
            VIEW ALL <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ProductCarousel
          products={newArrivals}
          ariaLabel="New arrivals"
          returnContext="/#new-arrivals"
          promotionBadges={promotionBadges}
          sectionId="new-arrivals"
        />
      </section>

      {/* 3. BESTSELLERS — IMMEDIATELY AFTER NEW ARRIVALS */}
      <section className="section-padding bestseller-section" id="bestsellers">
        <div className="section-header-flex">
          <div>
            <span className="section-kicker bestseller-kicker" style={{ color: 'var(--champagne-gold, #D7AE70)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--champagne-gold, #D7AE70)', display: 'inline-block' }}></span>
              ESSENTIAL STAPLES • MOST COVETED
            </span>
            <h2 className="section-title">Bestsellers</h2>
          </div>
          <Link href="/collections/bestsellers" className="view-all-link bestseller-view-all">
            VIEW ALL <span aria-hidden="true">→</span>
          </Link>
        </div>

        <ProductCarousel
          products={bestsellers}
          ariaLabel="Bestsellers"
          returnContext="/#bestsellers"
          promotionBadges={promotionBadges}
          sectionId="bestsellers"
        />
      </section>

      {/* 4. SHOP BY CATEGORY — AFTER BESTSELLERS */}
      <section className="section-padding category-section" id="shop-by-category">
        <div className="section-header-flex">
          <div>
            <span className="section-kicker" style={{ color: 'var(--terracotta)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--terracotta)', display: 'inline-block' }}></span>
              THE SEASONAL WARDROBE • CAPSULES
            </span>
            <h2 className="section-title">Shop by Category</h2>
          </div>
        </div>

        {categoryTiles.length > 0 ? (
          <div className="category-tiles-grid">
            {categoryTiles.map((cat) => (
              <Link href={cat.href} key={cat.title} className={`category-tile-card ${cat.className || ''}`}>
                <SenoImage src={cat.image} alt={cat.title ? `SENO ${cat.title} collection` : 'SENO collection'} className="category-tile-img" />
                <div className="category-tile-overlay">
                  <span
                    className="category-tile-badge"
                    style={{
                      backgroundColor: cat.tagBg,
                      color: cat.tagColor,
                      borderColor: cat.tagColor,
                    }}
                  >
                    {cat.tag}
                  </span>
                  <h3 className="category-tile-title">{cat.title}</h3>
                  <span className="category-tile-subtitle">{cat.subtitle}</span>
                  <span className="category-tile-cta">
                    EXPLORE CAPSULE <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : categoryFetchError ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--surface, #f9f9f9)', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', letterSpacing: '0.4px' }}>
              The category catalog is momentarily refreshing. Please explore the curated collections below.
            </p>
          </div>
        ) : null}
      </section>

      {/* 5. FEATURED OFFER SPOTLIGHT (Only if an active promotion exists) */}
      {activePromotions.length > 0 && (
        <section className="section-padding featured-offer-spotlight" style={{ background: 'linear-gradient(135deg, var(--warm-ivory-subtle) 0%, var(--warm-ivory) 50%, var(--terracotta-soft) 100%)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 0' }}>
            <span className="section-kicker" style={{ color: 'var(--terracotta)' }}>LIMITED TIME OFFER</span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 400, color: 'var(--ink)', margin: '8px 0 12px', letterSpacing: '-0.5px' }}>
              {activePromotions[0].hero_headline || activePromotions[0].name}
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14.5px', maxWidth: '600px', lineHeight: 1.6, margin: '0 0 24px' }}>
              {activePromotions[0].hero_subheading || activePromotions[0].description || 'Discover elevated silhouettes and limited-run pieces curated for this promotion.'}
            </p>
            <Link
              href={`/offers/${activePromotions[0].slug}`}
              className="dark-btn"
              style={{ padding: '14px 34px', fontSize: '11px', letterSpacing: '1.6px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--terracotta)', borderColor: 'var(--terracotta)' }}
            >
              <span>{activePromotions[0].hero_cta_text || 'SHOP THE OFFER'}</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      )}

      {/* 6. BEAUTY EDIT */}
      <section className="featured-edit-banner">
        <div className="bg-image">
          <img
            src="/images/cosmetics_banner.png"
            alt="SENO The Beauty Edit — Curated cosmetic and skincare collection"
          />
        </div>

        <div className="featured-edit-content">
          <span className="section-kicker" style={{ color: 'var(--dusty-rose)' }}>CURATED BEAUTY</span>
          <h2>
            THE BEAUTY EDIT
          </h2>
          <p>
            Elevate your everyday routine with our curated selection of premium beauty essentials.
          </p>
          <Link
            href="/collections/cosmetics"
            className="dark-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '15px 34px',
              letterSpacing: '1.4px',
              background: 'linear-gradient(135deg, var(--dusty-rose) 0%, #A95869 100%)',
              borderColor: 'rgba(215, 174, 112, 0.4)',
              color: '#ffffff',
              boxShadow: '0 4px 16px rgba(201, 130, 145, 0.35)'
            }}
          >
            <span>SHOP COSMETICS</span> <span>→</span>
          </Link>
        </div>
      </section>

      {/* 6b. BEAUTY PRODUCTS RAIL */}
      {cosmeticsProducts.length > 0 && (
        <section className="section-padding" id="beauty-edit" style={{ paddingTop: '24px' }}>
          <ProductCarousel
            products={cosmeticsProducts}
            ariaLabel="Beauty Edit"
            returnContext="/#beauty-edit"
            promotionBadges={promotionBadges}
            sectionId="beauty-edit"
          />
        </section>
      )}

      {/* 7. BRAND STATEMENT */}
        <section className="brand-statement-section" id="atelier-philosophy">
          <div className="brand-statement-card">
            <div className="brand-seal-badge">
              <span>SENO ATELIER</span>
              <span className="brand-seal-dot">•</span>
              <span>MUMBAI</span>
            </div>
            <span className="section-kicker" style={{ color: 'var(--champagne-gold)' }}>OUR ATELIER PHILOSOPHY</span>
            <h2 className="brand-statement-heading">
              CONSIDERED CLOTHING FOR EVERYDAY LIFE.
            </h2>
            <p className="brand-statement-copy">
              Designed in Mumbai for a life in perpetual motion. We balance precise architectural drape with durable natural textiles meant for continuous daily wear.
            </p>
            <div className="brand-statement-footer">
              <span className="brand-coords">18.9220° N, 72.8347° E</span>
              <span className="brand-coords-sep">•</span>
              <span className="brand-coords">COLABA ATELIER</span>
            </div>
          </div>
        </section>
    </div>
  )
}
