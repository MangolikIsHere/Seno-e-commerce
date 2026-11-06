'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Heart, Check, Share2 } from 'lucide-react'
import { Product, money } from '@/lib/catalog'
import { getColourSwatchHex, normalizeColourKey } from '@/lib/colours'
import { useStore } from '@/context/StoreContext'
import { SenoImage } from '@/components/SenoImage'
import { ShareProductModal } from '@/components/ShareProductModal'

interface ProductCardProps {
  product: Product
  returnContext?: string
  promotionBadge?: string
}

function getCategoryTheme(category?: string) {
  const cat = (category || '').toLowerCase()
  if (cat.includes('ethnic') || cat.includes('traditional') || cat.includes('saree') || cat.includes('kurta')) {
    return {
      accent: 'var(--terracotta)',
      soft: 'var(--terracotta-soft)',
      border: 'var(--terracotta-border)',
      text: '#94583A'
    }
  }
  if (cat.includes('western') || cat.includes('dress')) {
    return {
      accent: 'var(--deep-blue)',
      soft: 'var(--deep-blue-soft)',
      border: '#D0DCEB',
      text: '#2C3E55'
    }
  }
  if (cat.includes('topwear') || cat.includes('shirt') || cat.includes('tee')) {
    return {
      accent: 'var(--sage-green)',
      soft: 'var(--sage-green-soft)',
      border: '#D0DDD0',
      text: '#55684F'
    }
  }
  if (cat.includes('bottomwear') || cat.includes('pant') || cat.includes('trouser') || cat.includes('denim')) {
    return {
      accent: 'var(--charcoal)',
      soft: 'var(--charcoal-soft)',
      border: '#E2DDD5',
      text: '#292724'
    }
  }
  if (cat.includes('cosmetic') || cat.includes('beauty') || cat.includes('care') || cat.includes('skin')) {
    return {
      accent: 'var(--dusty-rose)',
      soft: 'var(--dusty-rose-soft)',
      border: '#F0D8DE',
      text: '#A0596A'
    }
  }
  if (cat.includes('accessories') || cat.includes('jewel') || cat.includes('gold')) {
    return {
      accent: 'var(--champagne-gold)',
      soft: 'var(--champagne-soft)',
      border: 'var(--champagne-border)',
      text: '#A67E42'
    }
  }
  return {
    accent: 'var(--champagne-gold)',
    soft: 'var(--warm-ivory-subtle)',
    border: 'var(--line)',
    text: 'var(--muted)'
  }
}

export function ProductCard({ product, returnContext, promotionBadge }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToCart } = useStore()
  const [added, setAdded] = useState(false)
  const [activeColour, setActiveColour] = useState<string | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)

  const wishlisted = isWishlisted(product.slug)
  const activePromoBadge = promotionBadge || (product as any).promotionBadge
  const catTheme = getCategoryTheme(product.category)

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
      addToCart(product, availableVariant, 1, false)
      setAdded(true)
      setTimeout(() => setAdded(false), 1800)
    }
  }

  const colourPrimaryImg = activeColour
    ? (product.colourPrimaries?.[normalizeColourKey(activeColour)] || product.colourImages?.[normalizeColourKey(activeColour)]?.[0])
    : null

  const primaryImg = colourPrimaryImg || product.image
  const secondaryImg =
    product.hoverImage && product.hoverImage !== product.image
      ? product.hoverImage
      : (product.images && product.images.length > 1
        ? product.images.find(img => img !== primaryImg) || null
        : null)

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
      <article
        className="product-card group"
        style={{
          position: 'relative',
          '--cat-accent': catTheme.accent,
          '--cat-soft': catTheme.soft,
          '--cat-border': catTheme.border
        } as React.CSSProperties}
      >
        {/* Visual media container: navigates to product */}
        <div className="product-visual-wrapper" style={{ display: 'block', position: 'relative' }}>
          <Link
            href={productHref}
            style={{ display: 'block' }}
            data-return-context={returnContext || undefined}
            onClick={handleProductLinkClick}
            aria-label={product.name ? `${product.name}${activeColour ? ` in ${activeColour}` : ''}` : 'SENO garment'}
          >
            <div className="product-visual">
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
              <div className="product-card-badges-container" style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 2 }}>
                {product.soldOut ? (
                  <span className="badge sold-out-badge">
                    Sold Out
                  </span>
                ) : activePromoBadge ? (
                  <span className="badge promo-offer-badge">
                    {activePromoBadge}
                  </span>
                ) : product.isBestseller ? (
                  <span className="badge bestseller-badge">
                    Bestseller
                  </span>
                ) : product.isNew ? (
                  <span className="badge new-badge">
                    New Arrival
                  </span>
                ) : product.isSale ? (
                  <span className="badge sale-badge">
                    Sale
                  </span>
                ) : null}
              </div>
            </div>
          </Link>

          {/* Quick Add Button — Elevated pill on bottom of visual */}
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
                  <Check size={12} strokeWidth={2.5} /> ADDED
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span>+ QUICK ADD</span>
                </span>
              )}
            </button>
          )}

          {/* Wishlist Button — Top Right */}
          <button
            className={`wishlist-btn ${wishlisted ? 'liked' : ''}`}
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            onClick={handleWishlistClick}
            type="button"
            data-no-navigation="true"
          >
            <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} strokeWidth={1.8} />
          </button>

          {/* Share Button — Top Right underneath Wishlist */}
          <button
            className="wishlist-btn share-btn"
            style={{ top: '48px' }}
            aria-label={`Share ${product.name}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShareModalOpen(true)
            }}
            type="button"
            data-no-navigation="true"
          >
            <Share2 size={13} strokeWidth={1.8} />
          </button>
        </div>

        {/* Information Area: Category, Title, Swatches, Pricing */}
        <div className="product-details-info">
          <Link
            href={productHref}
            style={{ display: 'block', textDecoration: 'none' }}
            data-return-context={returnContext || undefined}
            onClick={handleProductLinkClick}
          >
            {product.category && (
                <span
                  className="product-category-label product-category-pill"
                  style={{
                    backgroundColor: catTheme.soft,
                    color: catTheme.text,
                    borderColor: catTheme.border,
                  }}
                >
                  {product.category}
                </span>
          )}
                <h3 className="product-name-heading">
                  {product.name}
                </h3>
              </Link>

        {/* Colour Swatches Indicator */}
            {product.colors && product.colors.length > 1 && product.colors[0] !== 'Default' && (
          <div
            className="product-card-swatches"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '5px 0 6px' }}
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
                  aria-label={`Select colour ${col}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setActiveColour(col)
                  }}
                  onMouseEnter={() => setActiveColour(col)}
                  style={{
                    width: '13px',
                    height: '13px',
                    borderRadius: '50%',
                    backgroundColor: hex,
                    border: hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff' ? '1px solid #dcd6cd' : '1px solid rgba(41, 39, 36, 0.16)',
                    padding: 0,
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid var(--ink)' : 'none',
                    outlineOffset: '2px',
                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s ease, outline 0.15s ease, box-shadow 0.15s ease',
                    boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.08)'
                  }}
                />
              )
            })}
            {product.colors.length > 5 && (
              <span style={{ fontSize: '9.5px', color: 'var(--muted)', fontWeight: 600, marginLeft: '2px' }}>
                +{product.colors.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Pricing Line */}
        <Link
          href={productHref}
          style={{ display: 'block', textDecoration: 'none', marginTop: '4px' }}
          data-return-context={returnContext || undefined}
          onClick={handleProductLinkClick}
        >
          <div className="product-price-row">
            <span className="current-price">
              {money(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <>
                <span className="compare-price">
                  {money(product.compareAtPrice)}
                </span>
                <span className="product-card-discount-tag">
                  {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>
        </Link>
      </div>

      <ShareProductModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        product={{
          name: product.name,
          slug: product.slug,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          image: primaryImg,
          images: product.images,
          description: product.description,
          category: product.category,
          selectedColour: activeColour || undefined
        }}
      />
    </article>
          )
}
