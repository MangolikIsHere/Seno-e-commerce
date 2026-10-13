'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { getCollectionProducts, Product } from '@/lib/catalog'

interface CollectionViewProps {
  categoryTitle: string
  categorySlug: string
  categoryOptions?: string[]
  initialProducts?: Product[]
  categoryBanner?: string | null
  categoryDescription?: string | null
}

export function CollectionView({
  categoryTitle,
  categorySlug,
  categoryOptions = [],
  initialProducts = [],
  categoryBanner,
  categoryDescription,
}: CollectionViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categorySlug === 'all' || categorySlug === 'new-arrivals' ? 'All' : categoryTitle
  )
  const [availability, setAvailability] = useState<string>('All')
  const [selectedSize, setSelectedSize] = useState<string>('All')
  const [selectedColor, setSelectedColor] = useState<string>('All')
  const [sortOption, setSortOption] = useState<string>('Featured')
  const [gridDensity, setGridDensity] = useState<number>(4)
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false)

  const activeCategoryForQuery = categorySlug === 'new-arrivals' ? 'New arrivals' : selectedCategory

  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [loading, setLoading] = useState<boolean>(!initialProducts || initialProducts.length === 0)
  const isInitialMount = React.useRef(true)

  React.useEffect(() => {
    // If initialProducts were supplied on server render, skip duplicate initial fetch
    if (isInitialMount.current) {
      isInitialMount.current = false
      if (initialProducts && initialProducts.length > 0) {
        return
      }
    }

    let active = true
    const fetchProducts = async () => {
      setLoading(true)
      const data = await getCollectionProducts(activeCategoryForQuery, {
        availability,
        size: selectedSize,
        color: selectedColor,
        sort: sortOption,
      })
      if (active) {
        setProducts(data)
        setLoading(false)
      }
    }
    fetchProducts()
    return () => {
      active = false
    }
  }, [activeCategoryForQuery, availability, selectedSize, selectedColor, sortOption, initialProducts])

  const handleResetFilters = () => {
    setSelectedCategory('All')
    setAvailability('All')
    setSelectedSize('All')
    setSelectedColor('All')
    setSortOption('Featured')
  }

  const categoryFilterOptions = ['All', ...categoryOptions]
  const availabilityOptions = ['All', 'In stock', 'Sold out']
  const sizeOptions = ['All', 'XS', 'S', 'M', 'L', 'XL']
  const colorOptions = ['All', 'Black', 'White', 'Indigo', 'Charcoal', 'Cream', 'Olive', 'Stone']

  return (
    <div className="catalog-page-container">
      {categoryBanner ? (
        <div className="category-collection-hero-banner" style={{
          width: '100%',
          height: 'clamp(200px, 30vw, 340px)',
          position: 'relative',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '28px',
          background: '#f5f5f4'
        }}>
          <Image
            src={categoryBanner}
            alt={categoryTitle}
            fill
            priority
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 'clamp(18px, 4vw, 32px)',
            color: '#fff'
          }}>
            <span style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.9 }}>
              COLLECTION
            </span>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontFamily: 'Georgia, serif', margin: '4px 0 6px', fontWeight: 400, color: '#fff' }}>
              {categoryTitle}
            </h1>
            {categoryDescription && (
              <p style={{ margin: 0, fontSize: '14px', maxWidth: '640px', opacity: 0.92, lineHeight: 1.4 }}>
                {categoryDescription}
              </p>
            )}
            <span style={{ fontSize: '12px', marginTop: '6px', opacity: 0.8 }}>
              {products.length} {products.length === 1 ? 'piece' : 'pieces'} cataloged
            </span>
          </div>
        </div>
      ) : (
        <div className="catalog-title-row">
          <div>
            <span className="section-kicker">COLLECTION BROWSING</span>
            <h1>{categoryTitle}</h1>
          </div>
          <span className="results-count-text" style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </span>
        </div>
      )}

      <div className="catalog-toolbar-bar">
        <button
          className="filter-drawer-toggle-btn"
          onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
        >
          <SlidersHorizontal size={15} /> Filter
        </button>

        <div className="sort-select-wrapper">
          <span>Sort by</span>
          <select value={sortOption} onChange={e => setSortOption(e.target.value)}>
            <option value="Featured">Featured</option>
            <option value="Newest">Newest</option>
            <option value="Price: low to high">Price: Low → High</option>
            <option value="Price: high to low">Price: High → Low</option>
            <option value="Best selling">Best Selling</option>
          </select>
          <ChevronDown size={13} />
        </div>

        <div className="grid-density-controls">
          <span>View</span>
          {[2, 3, 4].map(n => (
            <button
              key={n}
              className={`density-btn ${gridDensity === n ? 'selected' : ''}`}
              onClick={() => setGridDensity(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="catalog-content-layout">
        {/* Sidebar Filters */}
        <aside className={`filter-sidebar-rail ${mobileFilterOpen ? 'mobile-active' : ''}`}>
          <div className="filter-rail-header">
            <span>Filter</span>
            <button
              onClick={() => setMobileFilterOpen(false)}
              style={{ display: mobileFilterOpen ? 'block' : 'none' }}
            >
              <X size={18} />
            </button>
          </div>

          <button className="filter-reset-btn" onClick={handleResetFilters}>
            Clear all / Reset
          </button>

          {/* Category Filter */}
          <div className="filter-group-box">
            <span className="filter-group-title">Category</span>
            {categoryFilterOptions.map(cat => (
              <button
                key={cat}
                className={`filter-option-btn ${selectedCategory === cat ? 'selected' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span className="filter-checkbox-square" />
                {cat}
              </button>
            ))}
          </div>

          {/* Availability Filter */}
          <div className="filter-group-box">
            <span className="filter-group-title">Availability</span>
            {availabilityOptions.map(avail => (
              <button
                key={avail}
                className={`filter-option-btn ${availability === avail ? 'selected' : ''}`}
                onClick={() => setAvailability(avail)}
              >
                <span className="filter-checkbox-square" />
                {avail}
              </button>
            ))}
          </div>

          {/* Size Filter */}
          <div className="filter-group-box">
            <span className="filter-group-title">Size</span>
            {sizeOptions.map(sz => (
              <button
                key={sz}
                className={`filter-option-btn ${selectedSize === sz ? 'selected' : ''}`}
                onClick={() => setSelectedSize(sz)}
              >
                <span className="filter-checkbox-square" />
                {sz}
              </button>
            ))}
          </div>

          {/* Color Filter */}
          <div className="filter-group-box">
            <span className="filter-group-title">Colour</span>
            {colorOptions.map(clr => (
              <button
                key={clr}
                className={`filter-option-btn ${selectedColor === clr ? 'selected' : ''}`}
                onClick={() => setSelectedColor(clr)}
              >
                <span className="filter-checkbox-square" />
                {clr}
              </button>
            ))}
          </div>
        </aside>

        {/* Product Grid */}
        <main className={`product-grid columns-${gridDensity}`}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
              Loading products...
            </div>
          ) : products.length > 0 ? (
            products.map(product => <ProductCard key={product.id} product={product} />)
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
              <p>No products match your selected filter criteria.</p>
              <button className="dark-btn" style={{ padding: '12px 20px', marginTop: '16px' }} onClick={handleResetFilters}>
                Clear Filters
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
