'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Heart, Check } from 'lucide-react'
import { Product, money } from '@/lib/catalog'
import { useStore } from '@/context/StoreContext'
import { SenoImage } from '@/components/SenoImage'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToCart } = useStore()
  const [added, setAdded] = useState(false)

  const wishlisted = isWishlisted(product.slug)

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.slug)
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const availableVariant = product.variants?.find(v => v.inventoryQuantity > 0)
    if (availableVariant) {
      addToCart(product, availableVariant)
      setAdded(true)
      setTimeout(() => setAdded(false), 1800)
    }
  }

  const primaryImg = product.image
  const secondaryImg = product.hoverImage && product.hoverImage !== product.image ? product.hoverImage : null

  return (
    <article className="product-card group">
      <Link href={`/products/${product.slug}`} className="product-visual-wrapper">
        <div className="product-visual" style={{ position: 'relative', overflow: 'hidden', aspectRatio: '3 / 4', background: 'var(--card-bg)' }}>
          <SenoImage
            src={primaryImg}
            alt={product.name}
            className="product-primary-img"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />

          {secondaryImg && (
            <SenoImage
              src={secondaryImg}
              alt=""
              className="product-secondary-img"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                inset: 0
              }}
            />
          )}

          {/* Editorial Badges */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 2 }}>
            {product.soldOut ? (
              <span className="badge sold-out-badge" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Archived / Sold Out
              </span>
            ) : product.isNew ? (
              <span className="badge new-badge" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                New Release
              </span>
            ) : product.isSale ? (
              <span className="badge sale-badge" style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Privé
              </span>
            ) : null}
          </div>

          {/* Wishlist Button */}
          <button
            className={`wishlist-btn ${wishlisted ? 'liked' : ''}`}
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            onClick={handleWishlistClick}
            type="button"
          >
            <Heart size={15} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Quick Add Button */}
          {!product.soldOut && (
            <button
              className="quick-add-btn"
              onClick={handleQuickAdd}
              aria-label={`Quick add ${product.name} to cart`}
              type="button"
            >
              {added ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> ADDED
                </span>
              ) : (
                <span>QUICK ADD +</span>
              )}
            </button>
          )}
        </div>

        <div className="product-details-info" style={{ marginTop: '12px' }}>
          <span className="product-category-label" style={{ fontSize: '9.5px', letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {product.category}
          </span>
          <h3 className="product-name-heading" style={{ fontSize: '13px', fontWeight: 500, margin: '4px 0 6px', color: 'var(--ink)' }}>
            {product.name}
          </h3>
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
