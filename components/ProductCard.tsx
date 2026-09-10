'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { Product, money } from '@/lib/catalog'
import { useStore } from '@/context/StoreContext'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { toggleWishlist, isWishlisted, addToCart } = useStore()
  const [imgSrc, setImgSrc] = useState(product.image)
  const [hoverSrc, setHoverSrc] = useState(product.hoverImage || product.image)
  const [imgError, setImgError] = useState(false)

  const wishlisted = isWishlisted(product.slug)

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWishlist(product.slug)
  }

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(product)
  }

  const fallbackPlaceholder = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'

  return (
    <article className="product-card">
      <Link href={`/products/${product.slug}`} className="product-visual-wrapper">
        <div className="product-visual">
          <img
            src={imgError ? fallbackPlaceholder : imgSrc}
            alt={product.name}
            className="product-primary-img"
            onError={() => setImgError(true)}
          />
          {product.hoverImage && !imgError && (
            <img
              src={hoverSrc}
              alt=""
              className="product-secondary-img"
              onError={() => setHoverSrc(imgSrc)}
            />
          )}

          {/* Badges */}
          {product.soldOut ? (
            <span className="badge sold-out-badge">Sold Out</span>
          ) : product.isNew ? (
            <span className="badge new-badge">New</span>
          ) : product.isSale ? (
            <span className="badge sale-badge">Sale</span>
          ) : null}

          {/* Wishlist Button */}
          <button
            className={`wishlist-btn ${wishlisted ? 'liked' : ''}`}
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
            onClick={handleWishlistClick}
          >
            <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Quick Add Button */}
          {!product.soldOut && (
            <button
              className="quick-add-btn"
              onClick={handleQuickAdd}
              aria-label={`Quick add ${product.name} to cart`}
            >
              Quick add <span>+</span>
            </button>
          )}
        </div>

        <div className="product-details-info">
          <span className="product-category-label">{product.category}</span>
          <h3 className="product-name-heading">{product.name}</h3>
          <div className="product-price-row">
            <span className="current-price">{money(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="compare-price">{money(product.compareAtPrice)}</span>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}
