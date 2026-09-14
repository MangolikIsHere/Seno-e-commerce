'use client'

import React, { useState, useMemo } from 'react'
import { SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { getCollectionProducts, Product } from '@/lib/catalog'

interface CollectionViewProps {
  categoryTitle: string
  categorySlug: string
}

export function CollectionView({ categoryTitle, categorySlug }: CollectionViewProps) {
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

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    let active = true
    const fetchProducts = async () => {
      setLoading(true)
      const data = await getCollectionProducts(activeCategoryForQuery, {
        availability,
        size: selectedSize,
        color: selectedColor,
        sort: sortOption
      })
      if (active) {
        setProducts(data)
        setLoading(false)
      }
    }
    fetchProducts()
    return () => { active = false }
  }, [activeCategoryForQuery, availability, selectedSize, selectedColor, sortOption])

  const handleResetFilters = () => {
    setSelectedCategory('All')
    setAvailability('All')
    setSelectedSize('All')
    setSelectedColor('All')
    setSortOption('Featured')
  }

  const categoryOptions = ['All', 'Topwear', 'Bottomwear', 'Outerwear', 'Accessories']
  const availabilityOptions = ['All', 'In stock', 'Sold out']
  const sizeOptions = ['All', 'XS', 'S', 'M', 'L', 'XL']
  const colorOptions = ['All', 'Black', 'White', 'Indigo', 'Charcoal', 'Cream', 'Olive', 'Stone']

  return (
    <div className="catalog-page-container">
      <div className="catalog-title-row">
        <div>
          <span className="section-kicker">COLLECTION BROWSING</span>
          <h1>{categoryTitle}</h1>
        </div>
        <span className="results-count-text" style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </span>
      </div>

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
            {categoryOptions.map(cat => (
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
