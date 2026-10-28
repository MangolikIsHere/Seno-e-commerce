'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Heart, Check } from 'lucide-react'
import { Product, money } from '@/lib/catalog'
import { getColourSwatchHex, normalizeColourKey } from '@/lib/colours'
import { useStore } from '@/context/StoreContext'
import { SenoImage } from '@/components/SenoImage'

interface ProductCardProps {
  product: Product
  returnContext?: string
  promotionBadge?: string
}

export function ProductCard({ product, returnContext, promotionBadge }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToCart } = useStore()
  const [added, setAdded] = useState(false)
  const [activeColour, setActiveColour] = useState<string | null>(null)

  const wishlisted = isWishlisted(product.slug)
  const activePromoBadge = promotionBadge || (product as any).promotionBadge

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.slug)
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const availableVariant = product.variants?.find(v =>
      (!activeColour || (v.colour || '').trim().toLowerCase() === activeColour.trim().toLowerCase()) &&
      v.inventoryQuantity > 0
    ) || product.variants?.find(v => v.inventoryQuantity > 0)
    if (availableVariant) {
      addToCart(product, availableVariant)
      setAdded(true)
      setTimeout(() => setAdded(false), 1800)
    }
  }

  const colourPrimaryImg = activeColour
    ? (product.colourPrimaries?.[normalizeColourKey(activeColour)] || product.colourImages?.[normalizeColourKey(activeColour)]?.[0])
    : null

  const primaryImg = colourPrimaryImg || product.image
  const secondaryImg = product.hoverImage && product.hoverImage !== product.image ? product.hoverImage : null
  const productHref = activeColour
    ? `/products/${product.slug}?colour=${encodeURIComponent(activeColour)}`
    : `/products/${product.slug}`

  const handleProductLinkClick = () => {
    if (!returnContext) return
    try {
      sessionStorage.setItem('seno_return_context', returnContext)
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
  }

  return (
    <article className="product-card group" style={{ position: 'relative' }}>
      {/* Image section: navigates to product */}
      <Link
        href={productHref}
        className="product-visual-wrapper"
        style={{ display: 'block', position: 'relative' }}
        data-return-context={returnContext || undefined}
        onClick={handleProductLinkClick}
      >
        <div className="product-visual" style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3 / 4', background: 'var(--card-bg)' }}>
          <SenoImage
            src={primaryImg}
            alt={product.name ? `${product.name}${activeColour ? ` in ${activeColour}` : ''}` : 'SENO garment'}
            className="product-primary-img"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {secondaryImg && !activeColour && (
            <SenoImage
              src={secondaryImg}
              alt={product.name ? `${product.name} — alternate view` : 'SENO garment — alternate view'}
              className="product-secondary-img"
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
            />
          )}

          {/* Editorial Badges */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2 }}>
            {product.soldOut ? (
              <span className="badge sold-out-badge" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Sold Out
              </span>
            ) : activePromoBadge ? (
              <span className="badge promo-offer-badge" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', background: 'var(--ink)', color: '#fff', fontWeight: 600 }}>
                {activePromoBadge}
              </span>
            ) : product.isNew ? (
              <span className="badge new-badge" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                New Release
              </span>
            ) : product.isSale ? (
              <span className="badge sale-badge" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Prive
              </span>
            ) : null}
          </div>

          {/* Quick Add */}
          {!product.soldOut && (
            <button
              className="quick-add-btn"
              onClick={handleQuickAdd}
              aria-label={`Quick add ${product.name} to cart`}
              type="button"
              data-no-navigation="true"
            >
              {added ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> ADDED
                </span>
              ) : (
                <span>ADD +</span>
              )}
            </button>
          )}

          {/* Wishlist */}
          <button
            className={`wishlist-btn ${wishlisted ? 'liked' : ''}`}
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            onClick={handleWishlistClick}
            type="button"
            data-no-navigation="true"
          >
            <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>
      </Link>

      {/* Text section: navigates to product */}
      <Link 
        href={productHref} 
        style={{ display: 'block' }} 
        data-return-context={returnContext || undefined}
        onClick={handleProductLinkClick}
      >
        <div className="product-details-info" style={{ marginTop: '12px' }}>
          <span className="product-category-label" style={{ fontSize: '9.5px', letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {product.category}
          </span>
          <h3 className="product-name-heading" style={{ fontSize: '13px', fontWeight: 500, margin: '4px 0 6px', color: 'var(--ink)' }}>
            {product.name}
          </h3>

          {/* Subtle Colour Swatches Indicator */}
          {product.colors && product.colors.length > 1 && product.colors[0] !== 'Default' && (
            <div
              className="product-card-swatches"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '4px 0 6px' }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              {product.colors.slice(0, 5).map(col => {
                const hex = product.colourGroups?.find(g => normalizeColourKey(g.colour) === normalizeColourKey(col))?.swatch ||
                  product.colourHexes?.[normalizeColourKey(col)] ||
                  getColourSwatchHex(col)
                const isSelected = (activeColour || product.colors[0]).trim().toLowerCase() === col.trim().toLowerCase()
                return (
                  <button
                    key={col}
                    type="button"
                    title={col}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setActiveColour(col)
                    }}
                    onMouseEnter={() => setActiveColour(col)}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: hex,
                      border: hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff' ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.15)',
                      padding: 0,
                      cursor: 'pointer',
                      outline: isSelected ? '1px solid var(--ink)' : 'none',
                      outlineOffset: '1px',
                      transition: 'transform 0.15s ease'
                    }}
                  />
                )
              })}
              {product.colors.length > 5 && (
                <span style={{ fontSize: '9.5px', color: 'var(--muted)' }}>
                  +{product.colors.length - 5}
                </span>
              )}
            </div>
          )}

          <div className="product-price-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="current-price" style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
              {money(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="compare-price" style={{ fontSize: '11px', textDecoration: 'line-through', color: 'var(--muted)' }}>
                {money(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}
