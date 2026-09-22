'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag, Check, RotateCcw } from 'lucide-react'
import { money, Product } from '@/lib/catalog'
import { useStore } from '@/context/StoreContext'
import { ProductCard } from '@/components/ProductCard'
import { SizeGuideModal } from '@/components/SizeGuideModal'
import { SenoImage } from '@/components/SenoImage'
import Image from 'next/image'

interface ProductDetailClientProps {
  product: Product
  relatedProducts: Product[]
  slug: string
}

export function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const router = useRouter()
  const { addToCart, toggleWishlist, isWishlisted } = useStore()

  const [activeImgIndex, setActiveImgIndex] = useState(0)
  const [galleryRatio, setGalleryRatio] = useState<number | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes.length === 1 ? product.sizes[0] : '')
  const [selectedColour, setSelectedColour] = useState<string>(product.colors.length === 1 ? product.colors[0] : '')
  const [quantity, setQuantity] = useState(1)
  const [openAccordion, setOpenAccordion] = useState<string>('Details')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [addedNotice, setAddedNotice] = useState(false)
  const [backUrl, setBackUrl] = useState('/collections/all')

  // Read return context saved by ProductCard when navigating to this product
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('seno_return_context')
      if (saved && saved.startsWith('/') && !saved.startsWith('/products/')) {
        setBackUrl(saved)
      }
    } catch {
      // Ignore storage errors
    }
  }, [])

  const handleBackToShop = () => {
    try {
      // Consume/clear return context so subsequent navigations don't use stale context
      sessionStorage.removeItem('seno_return_context')
    } catch {
      // Ignore storage errors
    }
  }

  const wishlisted = isWishlisted(product.slug)
  const galleryImages = product.images.length > 0 ? product.images : [product.image]

  // Find currently selected variant
  const selectedVariant = product.variants.find(v =>
    (!selectedSize || v.size === selectedSize) &&
    (!selectedColour || v.colour === selectedColour)
  )

  const displayPrice = selectedVariant?.priceOverride ?? product.price

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.inventoryQuantity < quantity) return
    addToCart(product, selectedVariant, quantity)
    setAddedNotice(true)
    setTimeout(() => setAddedNotice(false), 2500)
  }

  const handleBuyNow = () => {
    if (!selectedVariant || selectedVariant.inventoryQuantity < quantity) return
    addToCart(product, selectedVariant, quantity)
    router.push('/cart')
  }

  const isSizeAvailable = (sz: string) => {
    const v = product.variants.find(v => v.size === sz && (!selectedColour || v.colour === selectedColour))
    return v && v.inventoryQuantity > 0
  }

  const isColourAvailable = (col: string) => {
    const v = product.variants.find(v => v.colour === col && (!selectedSize || v.size === selectedSize))
    return v && v.inventoryQuantity > 0
  }

  const canAddToCart = selectedVariant && selectedVariant.inventoryQuantity > 0

  return (
    <div className="product-detail-container">
      <Link href={backUrl} onClick={handleBackToShop} className="breadcrumb-back-link">
        <ArrowLeft size={13} /> BACK TO SHOP
      </Link>

      <div className="product-detail-grid">
        {/* Gallery */}
        <div className="product-gallery-view">
          <div className="gallery-thumbnails-row">
            {galleryImages.map((imgUrl, idx) => (
              <button
                key={idx}
                className={`thumb-btn ${idx === activeImgIndex ? 'active' : ''}`}
                onClick={() => setActiveImgIndex(idx)}
              >
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                  <SenoImage
                    src={imgUrl}
                    alt={`${product.name} view ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div
            className="main-gallery-image"
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--card-bg)',
              aspectRatio: galleryRatio ? `${galleryRatio}` : undefined,
              maxHeight: '82vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'aspect-ratio 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <SenoImage
              src={galleryImages[activeImgIndex] || product.image}
              alt={product.name}
              onLoad={(e: React.SyntheticEvent<HTMLImageElement>) => {
                const img = e.currentTarget
                if (img.naturalWidth && img.naturalHeight) {
                  setGalleryRatio(img.naturalWidth / img.naturalHeight)
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Product Information */}
        <div className="product-info-sidebar">
          <div className="product-header">
            <div className="product-category-tag">{product.category}</div>
            <h1 className="product-title-detail">{product.name}</h1>
            <div className="product-price-row">
              <span className="product-price-current">{money(displayPrice)}</span>
              {product.compareAtPrice && (
                <span className="product-price-compare">{money(product.compareAtPrice)}</span>
              )}
            </div>
          </div>

          {/* Colour Option Selector */}
          {product.colors && product.colors.length > 0 && product.colors[0] !== 'Default' && (
            <div className="product-option-section">
              <div className="product-option-label">
                <span>COLOUR:</span>
                <strong>{selectedColour || 'SELECT COLOUR'}</strong>
              </div>
              <div className="product-color-options">
                {product.colors.map(col => {
                  const avail = isColourAvailable(col)
                  return (
                    <button
                      key={col}
                      className={`color-selector-chip ${selectedColour === col ? 'selected' : ''} ${!avail ? 'out-of-stock' : ''}`}
                      onClick={() => setSelectedColour(col)}
                    >
                      {col}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Size Option Selector */}
          {product.sizes && product.sizes.length > 0 && product.sizes[0] !== 'One size' && (
            <div className="product-option-section">
              <div className="product-option-label">
                <span>SIZE:</span>
                <strong>{selectedSize || 'SELECT SIZE'}</strong>
                <button
                  type="button"
                  onClick={() => setSizeGuideOpen(true)}
                  className="size-guide-trigger"
                >
                  SIZE GUIDE
                </button>
              </div>
              <div className="product-size-options">
                {product.sizes.map(sz => {
                  const avail = isSizeAvailable(sz)
                  return (
                    <button
                      key={sz}
                      className={`size-selector-chip ${selectedSize === sz ? 'selected' : ''} ${!avail ? 'out-of-stock' : ''}`}
                      onClick={() => setSelectedSize(sz)}
                    >
                      {sz}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Inventory Availability Status */}
          <div className="inventory-status-notice">
            {product.soldOut ? (
              <span className="status-soldout">SOLD OUT</span>
            ) : selectedVariant ? (
              selectedVariant.inventoryQuantity > 0 ? (
                <span className="status-instock">
                  <Check size={12} /> IN STOCK ({selectedVariant.inventoryQuantity} UNITS REMAINING)
                </span>
              ) : (
                <span className="status-soldout">SELECTED VARIATION OUT OF STOCK</span>
              )
            ) : (
              <span className="status-select-prompt">PLEASE SELECT OPTIONS TO CHECK INVENTORY</span>
            )}
          </div>

          {/* Quantity and Actions */}
          <div className="product-action-panel">
            <div className="quantity-stepper">
              <button
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus size={13} />
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => setQuantity(q => Math.min(selectedVariant?.inventoryQuantity || 10, q + 1))}
                disabled={!selectedVariant || quantity >= selectedVariant.inventoryQuantity}
              >
                <Plus size={13} />
              </button>
            </div>

            <button
              className="dark-btn add-to-cart-btn"
              disabled={!canAddToCart}
              onClick={handleAddToCart}
            >
              <ShoppingBag size={14} />
              {addedNotice ? 'ADDED TO BAG' : canAddToCart ? 'ADD TO BAG' : 'OUT OF STOCK'}
            </button>

            <button
              className={`wishlist-toggle-icon-btn ${wishlisted ? 'active' : ''}`}
              onClick={() => toggleWishlist(product.slug)}
              title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>

          {canAddToCart && (
            <button className="outline-btn buy-now-btn" onClick={handleBuyNow}>
              BUY NOW WITH DIRECT CHECKOUT →
            </button>
          )}

          {/* Prominent Return Policy Badge & Customer Guarantee */}
          <div style={{ marginTop: '16px', marginBottom: '20px' }}>
            <div className={`product-trust-badge ${product.returnPolicy?.isReturnable ? 'returnable' : 'non-returnable'}`}>
              <RotateCcw size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '12px', letterSpacing: '0.4px' }}>
                  {product.returnPolicy?.isReturnable
                    ? `${product.returnPolicy.returnWindowDays}-Day Returns & Free Exchanges`
                    : 'Final Sale — Non-Returnable Piece'}
                </strong>
                <span style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px', display: 'block', lineHeight: 1.4 }}>
                  {product.returnPolicy?.isReturnable
                    ? product.returnPolicy.returnPolicyNotes || 'Complimentary reverse doorstep pickup across India. Garments must be unworn with original tags.'
                    : 'This curated specialty piece cannot be returned or exchanged once dispatched.'}
                </span>
              </div>
            </div>
          </div>

          {/* Accordion Details */}
          <div className="product-accordion-group">
            <div className="accordion-item">
              <button
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Details' ? '' : 'Details')}
              >
                <span>DESCRIPTION & DETAILS</span>
                <span>{openAccordion === 'Details' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Details' && (
                <div className="accordion-content">
                  <p>{product.description}</p>
                  {product.details && product.details.length > 0 && (
                    <ul>
                      {product.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="accordion-item">
              <button
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Shipping' ? '' : 'Shipping')}
              >
                <span>COMPLIMENTARY SHIPPING & RETURNS</span>
                <span>{openAccordion === 'Shipping' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Shipping' && (
                <div className="accordion-content">
                  <p>
                    Complimentary express shipping on all orders over ₹1,999 across India. Standard orders dispatched within 24–48 hours in signature museum-grade archival packaging.
                  </p>
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    <strong style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Return &amp; Exchange Policy:
                    </strong>{' '}
                    {product.returnPolicy?.isReturnable ? (
                      <span>
                        Eligible for return and size exchange within <strong>{product.returnPolicy.returnWindowDays} days</strong> of delivery. {product.returnPolicy.returnPolicyNotes || 'All items must be in original condition with security ribbons and designer packaging intact.'}
                      </span>
                    ) : (
                      <span>
                        <strong>Final Sale:</strong> This item is strictly non-returnable and non-exchangeable once dispatched.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products / Curated Selection */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <div className="section-header-flex">
            <div>
              <span className="section-kicker">CURATED SELECTION</span>
              <h2 className="section-title">YOU MAY ALSO APPRECIATE</h2>
            </div>
            <Link href="/collections/all" className="view-all-link">
              EXPLORE ALL <span>→</span>
            </Link>
          </div>

          <div className="product-grid columns-4">
            {relatedProducts.map(rp => (
              <ProductCard key={rp.id} product={rp} returnContext={backUrl} />
            ))}
          </div>
        </section>
      )}

      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  )
}
