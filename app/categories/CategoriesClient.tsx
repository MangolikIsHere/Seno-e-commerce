'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { SenoImage } from '@/components/SenoImage'
import { Product } from '@/lib/catalog'

interface CategoryItem {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
}

interface CategoriesClientProps {
  initialCategories: CategoryItem[]
  initialProducts: Product[]
}

const CATEGORY_META: Record<string, { subtitle: string; fallbackImage: string }> = {
  'ethnic-traditional-wear': {
    subtitle: 'Heritage silhouettes & artisanal craft',
    fallbackImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
  },
  western: {
    subtitle: 'Contemporary silhouettes & casual luxury',
    fallbackImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
  },
  topwear: {
    subtitle: 'Structured tees, shirts & luxury knits',
    fallbackImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
  },
  bottomwear: {
    subtitle: 'Tailored trousers, denims & relaxed fits',
    fallbackImage: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
  },
  cosmetics: {
    subtitle: 'Clean formulations & elevated self-care',
    fallbackImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
  },
}

export function CategoriesClient({ initialCategories, initialProducts }: CategoriesClientProps) {
  // Ensure the 5 canonical SENO categories are always represented in exact order
  const canonicalCategories = [
    {
      name: 'Ethnic & Traditional Wear',
      slug: 'ethnic-traditional-wear',
    },
    {
      name: 'Western',
      slug: 'western',
    },
    {
      name: 'Topwear',
      slug: 'topwear',
    },
    {
      name: 'Bottomwear',
      slug: 'bottomwear',
    },
    {
      name: 'Cosmetics',
      slug: 'cosmetics',
    },
  ]

  // Merge database category data (images, descriptions) with the canonical list
  const categoryCards = canonicalCategories.map((c) => {
    const dbCat = initialCategories.find(
      (cat) => cat.slug.toLowerCase() === c.slug.toLowerCase() || cat.name.toLowerCase() === c.name.toLowerCase()
    )
    const meta = CATEGORY_META[c.slug]
    const count = initialProducts.filter((p) => p.category?.toLowerCase() === c.name.toLowerCase()).length

    return {
      name: dbCat?.name || c.name,
      slug: c.slug,
      subtitle: dbCat?.description || meta?.subtitle || 'Explore collection',
      image: dbCat?.image_url || meta?.fallbackImage,
      count,
      href: `/collections/${c.slug}`,
    }
  })

  const [activeFilter, setActiveFilter] = useState<string>('all')

  const filteredProducts =
    activeFilter === 'all'
      ? initialProducts
      : initialProducts.filter((p) => {
          const cat = categoryCards.find((c) => c.slug === activeFilter)
          return cat ? p.category?.toLowerCase() === cat.name.toLowerCase() : true
        })

  return (
    <div className="categories-page-wrapper">
      {/* 1. Header & Breadcrumb */}
      <div className="catalog-title-row" style={{ padding: '20px 16px 12px' }}>
        <div>
          <span className="section-kicker">CURATED WARDROBE</span>
          <h1 style={{ fontSize: '26px', fontFamily: 'Georgia, serif', margin: '4px 0 2px', letterSpacing: '-0.5px' }}>
            Categories
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)', letterSpacing: '0.2px' }}>
            Explore luxury garments, modern silhouettes & considered beauty
          </p>
        </div>
      </div>

      {/* 2. Top Category Cards Grid (Full-Bleed Luxury Visual Tiles) */}
      <section className="categories-cards-section" style={{ padding: '0 10px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {categoryCards.map((cat, idx) => (
            <Link
              key={cat.slug}
              href={cat.href}
              className="seno-cat-card"
              style={{
                animationDelay: `${0.04 + idx * 0.05}s`,
                gridColumn: idx === 4 ? 'span 2' : undefined,
                aspectRatio: idx === 4 ? '2.15 / 1' : '1 / 1.22',
              }}
            >
              <SenoImage src={cat.image} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div className="seno-cat-overlay">
                <span className="seno-cat-kicker">
                  {cat.slug === 'ethnic-traditional-wear' ? 'HERITAGE ATELIER' :
                   cat.slug === 'western' ? 'CONTEMPORARY FORMS' :
                   cat.slug === 'topwear' ? 'SHIRTS & LUXURY KNITS' :
                   cat.slug === 'bottomwear' ? 'TAILORED & RELAXED' :
                   'SENO BEAUTY & ESSENTIALS'}
                </span>
                <h2 className="seno-cat-title">{cat.name}</h2>
                <span className="seno-cat-action">
                  {cat.count > 0 ? `${cat.count} PIECES →` : 'EXPLORE COLLECTION →'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Filter Pills Bar */}
      <div className="categories-filter-bar" style={{ padding: '0 16px 16px' }}>
        <div className="categories-filter-scroll">
          <button
            type="button"
            className={`category-filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <Sparkles size={12} style={{ marginRight: '4px' }} />
            All Categories ({initialProducts.length})
          </button>
          {categoryCards.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              className={`category-filter-chip ${activeFilter === cat.slug ? 'active' : ''}`}
              onClick={() => setActiveFilter(cat.slug)}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      {/* 4. All Categories / All Products Section */}
      <section className="categories-products-section" style={{ padding: '0 16px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <span className="section-kicker">
              {activeFilter === 'all' ? 'COMPLETE SENO CATALOG' : 'FILTERED SELECTION'}
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: '17px', fontFamily: 'Georgia, serif' }}>
              {activeFilter === 'all'
                ? 'All Products'
                : categoryCards.find((c) => c.slug === activeFilter)?.name}
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'ITEM' : 'ITEMS'}
          </span>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="products-grid catalog-grid-2col">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                returnContext="/categories"
              />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 16px', background: 'var(--card-bg, #f5f5f2)', borderRadius: '2px' }}>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 12px' }}>
              No pieces currently in this specific view.
            </p>
            <button
              type="button"
              className="dark-btn"
              style={{ fontSize: '11px', padding: '10px 18px' }}
              onClick={() => setActiveFilter('all')}
            >
              VIEW ALL PRODUCTS
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
