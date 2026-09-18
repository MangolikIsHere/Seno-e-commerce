import React from 'react'
import Link from 'next/link'
import { ProductCard } from '@/components/ProductCard'
import { SenoImage } from '@/components/SenoImage'
import { getNewArrivals, getBestsellers } from '@/lib/catalog'
import { getActiveCategories } from '@/lib/categories'

export default async function HomePage() {
  const newArrivals = await getNewArrivals(8)
  const bestsellers = await getBestsellers(8)
  const categories = await getActiveCategories()

  const categoryPresentation: Record<string, { subtitle: string; className?: string }> = {
    'ethnic-traditional-wear': {
      subtitle: 'Heritage silhouettes & modern craft',
      className: 'category-tile-feature'
    },
    western: {
      subtitle: 'Contemporary everyday forms',
      className: 'category-tile-feature'
    },
    topwear: {
      subtitle: 'Shirts, tees & elevated essentials'
    },
    bottomwear: {
      subtitle: 'Denim, trousers & modern separates'
    },
    cosmetics: {
      subtitle: 'Beauty, care & finishing touches'
    }
  }

  const categoryTiles = categories.map(category => ({
    title: category.name.toUpperCase(),
    subtitle: categoryPresentation[category.slug]?.subtitle || category.description || 'Explore the current SENO collection.',
    image: category.image_url || '/placeholder.jpg',
    href: `/collections/${category.slug}`,
    className: categoryPresentation[category.slug]?.className
  }))

  return (
    <div className="homepage-storefront">
      {/* 1. HERO */}
      <section className="hero-section">
        <div className="hero-image-wrapper">
          <img
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85"
            alt="SENO Spring / Summer 26 Campaign"
          />
        </div>
        <div className="hero-content-overlay">
          <span className="hero-season-kicker">SPRING / SUMMER 26</span>
          <h1 className="hero-headline">
            New forms
            <br />
            for everyday.
          </h1>
          <Link href="/collections/new-arrivals" className="hero-cta-btn">
            SHOP NOW <span>→</span>
          </Link>
        </div>
      </section>

      {/* 2. SHOP BY CATEGORY */}
      <section className="section-padding category-section">
        <div className="section-header-flex">
          <div>
            <span className="section-kicker">THE SEASONAL WARDROBE</span>
            <h2 className="section-title">Shop by Category</h2>
          </div>
        </div>

        <div className="category-tiles-grid">
          {categoryTiles.map((cat) => (
            <Link href={cat.href} key={cat.title} className={`category-tile-card ${cat.className || ''}`}>
              <SenoImage src={cat.image} alt={cat.title} className="category-tile-img" />
              <div className="category-tile-overlay">
                <h3 className="category-tile-title">{cat.title}</h3>
                <span className="category-tile-subtitle">{cat.subtitle}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. NEW ARRIVALS */}
      <section className="section-padding">
        <div className="section-header-flex">
          <div>
            <span className="section-kicker">CURATED RELEASES</span>
            <h2 className="section-title">New Arrivals</h2>
          </div>
          <Link href="/collections/new-arrivals" className="view-all-link">
            VIEW ALL
          </Link>
        </div>

        <div className="product-rail" aria-label="New arrivals" tabIndex={0}>
          {newArrivals.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. BESTSELLERS */}
      <section className="section-padding bestseller-section">
        <div className="section-header-flex">
          <div>
            <span className="section-kicker">ESSENTIAL STAPLES</span>
            <h2 className="section-title">Bestsellers</h2>
          </div>
          <Link href="/collections/bestsellers" className="view-all-link">VIEW ALL <span aria-hidden="true">→</span></Link>
        </div>

        <div className="product-rail" aria-label="Bestsellers" tabIndex={0}>
          {bestsellers.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. FEATURED EDIT */}
      <section className="featured-edit-banner">
        <div className="featured-edit-content">
          <span className="section-kicker">EDITORIAL EDIT</span>
          <h2>THE SENO EDIT</h2>
          <p>
            Considered tactile layers engineered for seamless daily transitions. High density ribbing, unwashed Japanese raw denim, and fluid tropical wools designed to age with personality.
          </p>
          <Link href="/collections/all" className="dark-btn" style={{ display: 'inline-flex', padding: '14px 28px' }}>
            EXPLORE THE EDIT <span>→</span>
          </Link>
        </div>
        <div className="featured-edit-image">
          <SenoImage
            src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80"
            alt="The SENO Edit"
          />
        </div>
      </section>

      {/* 6. BRAND STATEMENT */}
      <section className="brand-statement-section">
        <span className="section-kicker">OUR PHILOSOPHY</span>
        <h2 className="brand-statement-heading">
          CONSIDERED CLOTHING FOR EVERYDAY LIFE.
        </h2>
        <p className="brand-statement-copy">
          Designed in Mumbai for a life in perpetual motion. We balance precise architectural drape with durable natural textiles meant for continuous daily wear.
        </p>
      </section>
    </div>
  )
}
