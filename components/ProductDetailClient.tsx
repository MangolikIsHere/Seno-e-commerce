'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag, Check, RotateCcw } from 'lucide-react'
import { money, Product } from '@/lib/catalog'
import { getColourSwatchHex, normalizeColourKey } from '@/lib/colours'
import { useStore } from '@/context/StoreContext'
import { ProductCard } from '@/components/ProductCard'
import { SizeGuideModal } from '@/components/SizeGuideModal'
import { SenoImage } from '@/components/SenoImage'
import { Promotion } from '@/lib/promotions-shared'
import { CheckoutPolicyModal } from '@/components/CheckoutPolicyModal'
import Image from 'next/image'

interface ProductDetailClientProps {
  product: Product
  relatedProducts: Product[]
  slug: string
  applicablePromotion?: Promotion | null
}

export function ProductDetailClient({
  product,
  relatedProducts,
  applicablePromotion
}: ProductDetailClientProps) {
  const router = useRouter()
  const { addToCart, toggleWishlist, isWishlisted } = useStore()

  // Initialize selectedColour, respecting URL param ?colour= if present
  const [selectedColour, setSelectedColour] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const colParam = urlParams.get('colour')
        if (colParam && product.colors.some(c => c.trim().toLowerCase() === colParam.trim().toLowerCase())) {
          return product.colors.find(c => c.trim().toLowerCase() === colParam.trim().toLowerCase()) || colParam
        }
      } catch {
        // Ignore URL read error
      }
    }
    return product.colors.length > 0 && product.colors[0] !== 'Default' ? product.colors[0] : (product.colors[0] || '')
  })

  // Sizes available for the currently selected colour
  const availableSizesForSelectedColour = useMemo(() => {
    if (!selectedColour || selectedColour === 'Default') return product.sizes
    const variantsForColour = product.variants.filter(v =>
      (v.colour || '').trim().toLowerCase() === selectedColour.trim().toLowerCase()
    )
    if (variantsForColour.length === 0) return product.sizes
    const sizesSet = new Set<string>()
    const res: string[] = []
    for (const v of variantsForColour) {
      const s = v.size?.trim()
      if (s && !sizesSet.has(s.toLowerCase())) {
        sizesSet.add(s.toLowerCase())
        res.push(s)
      }
    }
    return res.length > 0 ? res : product.sizes
  }, [product.sizes, product.variants, selectedColour])

  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (availableSizesForSelectedColour.length === 1 && availableSizesForSelectedColour[0] !== 'One size') {
      return availableSizesForSelectedColour[0]
    }
    return product.sizes.length === 1 ? product.sizes[0] : ''
  })

  const [activeImgIndex, setActiveImgIndex] = useState(0)
  const [galleryRatio, setGalleryRatio] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [openAccordion, setOpenAccordion] = useState<string>('Details')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [buyNowPolicyModalOpen, setBuyNowPolicyModalOpen] = useState(false)
  const [addedNotice, setAddedNotice] = useState(false)
  const [wishlistNotice, setWishlistNotice] = useState(false)
  const [backUrl, setBackUrl] = useState('/collections/all')

  // Resolve active gallery images based on selectedColour
  const activeColourKey = selectedColour ? normalizeColourKey(selectedColour) : ''
  const colourSpecificImages = activeColourKey && product.colourImages?.[activeColourKey] && product.colourImages[activeColourKey].length > 0
    ? product.colourImages[activeColourKey]
    : null

  const galleryImages = (colourSpecificImages || (product.images.length > 0 ? product.images : (product.image ? [product.image] : []))).filter(Boolean)

  // Handle switching colour
  const handleSelectColour = (col: string) => {
    if (col === selectedColour) return
    setSelectedColour(col)
    setActiveImgIndex(0) // Immediately display that colour's primary image

    // If currently selected size is unavailable in the newly selected colour, clear or safely switch
    if (selectedSize) {
      const matchInNewColour = product.variants.find(v =>
        (v.colour || '').trim().toLowerCase() === col.trim().toLowerCase() &&
        (v.size || '').trim().toLowerCase() === selectedSize.trim().toLowerCase() &&
        v.inventoryQuantity > 0
      )
      if (!matchInNewColour) {
        const inStockSizesForNewColour = product.variants
          .filter(v => (v.colour || '').trim().toLowerCase() === col.trim().toLowerCase() && v.inventoryQuantity > 0)
          .map(v => v.size)
        if (inStockSizesForNewColour.length === 1) {
          setSelectedSize(inStockSizesForNewColour[0])
        } else {
          setSelectedSize('')
        }
      }
    }
  }

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
      sessionStorage.removeItem('seno_return_context')
    } catch {
      // Ignore storage errors
    }
  }

  // Reset selectedColour if no longer available in active colours
  useEffect(() => {
    if (selectedColour && !product.colors.some(c => c.trim().toLowerCase() === selectedColour.trim().toLowerCase())) {
      setSelectedColour(product.colors.length === 1 ? product.colors[0] : '')
    }
  }, [product.colors, selectedColour])

  // Reset selectedSize if no longer available in active sizes
  useEffect(() => {
    if (selectedSize && !availableSizesForSelectedColour.some(s => s.trim().toLowerCase() === selectedSize.trim().toLowerCase())) {
      setSelectedSize(availableSizesForSelectedColour.length === 1 ? availableSizesForSelectedColour[0] : '')
    }
  }, [availableSizesForSelectedColour, selectedSize])

  const wishlisted = isWishlisted(product.slug)

  // Find currently selected variant (case-insensitive to avoid matching issues between Black vs BLACK)
  const selectedVariant = product.variants.find(v =>
    (!selectedSize || (v.size || '').trim().toLowerCase() === selectedSize.trim().toLowerCase()) &&
    (!selectedColour || (v.colour || '').trim().toLowerCase() === selectedColour.trim().toLowerCase())
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

    try {
      if (sessionStorage.getItem('seno_checkout_policy_acknowledged') === 'true') {
        router.push('/checkout')
        return
      }

    } catch {
      // Ignore storage restrictions
    }
    setBuyNowPolicyModalOpen(true)
  }

  const handleWishlistToggle = () => {
    toggleWishlist(product.slug)
    setWishlistNotice(true)
    window.setTimeout(() => setWishlistNotice(false), 1800)
  }

  const handleContinueBuyNowCheckout = () => {
    setBuyNowPolicyModalOpen(false)
    router.push('/checkout')
  }

  const isSizeAvailable = (sz: string) => {
    const v = product.variants.find(v =>
      (v.size || '').trim().toLowerCase() === sz.trim().toLowerCase() &&
      (!selectedColour || (v.colour || '').trim().toLowerCase() === selectedColour.trim().toLowerCase())
    )
    return !!(v && v.inventoryQuantity > 0)
  }

  const isColourAvailable = (col: string) => {
    const v = product.variants.find(v =>
      (v.colour || '').trim().toLowerCase() === col.trim().toLowerCase() &&
      (!selectedSize || (v.size || '').trim().toLowerCase() === selectedSize.trim().toLowerCase())
    )
    return !!(v && v.inventoryQuantity > 0)
  }

  const canAddToCart = !product.soldOut && product.variants.length > 0 && !!selectedVariant && selectedVariant.inventoryQuantity > 0

  return (
    <div className="product-detail-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <Link href={backUrl} onClick={handleBackToShop} className="breadcrumb-back-link">
          <ArrowLeft size={13} /> BACK TO SHOP
        </Link>
        {product.category && (
          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span>/</span>
            <Link
              href={`/collections/${(product as any).categorySlug || product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`}
              style={{ color: 'var(--ink)', textDecoration: 'none', fontWeight: 500, letterSpacing: '0.8px', textTransform: 'uppercase' }}
            >
              {product.category}
            </Link>
          </span>
        )}
      </div>

      <div className="product-detail-grid">
        {/* Gallery */}
        <div className="product-gallery-view">
          {galleryImages.length > 1 && (
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
          )}

          <div
            className="main-gallery-image"
            style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'var(--card-bg)',
              aspectRatio: galleryRatio ? `${galleryRatio}` : undefined,
              maxHeight: '82vh',
              minHeight: galleryImages.length === 0 ? '360px' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'aspect-ratio 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {galleryImages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: 'var(--muted)',
                  width: '100%'
                }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '18px',
                    letterSpacing: '2px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    opacity: 0.6,
                    marginBottom: '6px'
                  }}
                >
                  SENO
                </span>
                <span style={{ fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.7 }}>
                  No photos added yet
                </span>
              </div>
            ) : (
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
            )}
          </div>
        </div>

        {/* Product Information */}
        <div className="product-info-sidebar">
          <div className="product-header">
            <div className="product-category-tag">{product.category}</div>
            <h1 className="product-title-detail">{product.name}</h1>
            <div className="product-price-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="product-price-current">
                {applicablePromotion?.type === 'percentage' &&
                !applicablePromotion.min_cart_value &&
                (!applicablePromotion.min_quantity || applicablePromotion.min_quantity <= 1) &&
                !applicablePromotion.coupon_code
                  ? money(Math.round(displayPrice * (1 - applicablePromotion.discount_value / 100)))
                  : money(displayPrice)}
              </span>
              {applicablePromotion?.type === 'percentage' &&
              !applicablePromotion.min_cart_value &&
              (!applicablePromotion.min_quantity || applicablePromotion.min_quantity <= 1) &&
              !applicablePromotion.coupon_code ? (
                <>
                  <span className="product-price-compare" style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>
                    {money(displayPrice)}
                  </span>
                  <span className="badge promo-offer-badge" style={{ fontSize: '10px', background: 'var(--ink)', color: '#fff', padding: '3px 7px', borderRadius: '2px', fontWeight: 600 }}>
                    {Math.round(applicablePromotion.discount_value)}% OFF
                  </span>
                </>
              ) : product.compareAtPrice ? (
                <span className="product-price-compare">{money(product.compareAtPrice)}</span>
              ) : null}
            </div>

            {/* Promotional Messaging */}
            {applicablePromotion && (
              <div style={{ marginTop: '10px', marginBottom: '4px' }}>
                {applicablePromotion.type === 'bogo' ? (
                  <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '3px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink)' }}>
                      BUY 1 GET 1 FREE
                    </span>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                      Add another eligible item to unlock your free piece.
                    </p>
                  </div>
                ) : applicablePromotion.min_cart_value ? (
                  <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
                      {applicablePromotion.type === 'percentage'
                        ? `${applicablePromotion.discount_value}% OFF`
                        : `₹${applicablePromotion.discount_value} OFF`}{' '}
                      ABOVE ₹{applicablePromotion.min_cart_value.toLocaleString('en-IN')}
                    </span>
                  </div>
                ) : applicablePromotion.coupon_code ? (
                  <div style={{ background: '#fafafa', border: '1px dashed #bbb', padding: '8px 12px', borderRadius: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>
                      Use code <strong>{applicablePromotion.coupon_code}</strong> at checkout
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Colour Option Selector */}
          {product.colors && product.colors.length > 0 && product.colors[0] !== 'Default' && (
            <div className="product-option-section">
              <div className="product-option-label">
                <span>COLOUR:</span>
                <strong>{selectedColour || 'SELECT COLOUR'}</strong>
              </div>
              <div className="product-color-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {product.colors.map(col => {
                  const avail = isColourAvailable(col)
                  const swatchHex = product.colourGroups?.find(g => normalizeColourKey(g.colour) === normalizeColourKey(col))?.swatch ||
                    product.colourHexes?.[normalizeColourKey(col)] ||
                    getColourSwatchHex(col)
                  const isSelected = selectedColour?.trim().toLowerCase() === col.trim().toLowerCase()
                  return (
                    <button
                      key={col}
                      type="button"
                      className={`color-selector-chip ${isSelected ? 'selected' : ''} ${!avail ? 'out-of-stock' : ''}`}
                      onClick={() => handleSelectColour(col)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <span
                        className="color-swatch-circle"
                        style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: swatchHex,
                          border: swatchHex.toLowerCase() === '#ffffff' || swatchHex.toLowerCase() === '#fff' ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.15)',
                          flexShrink: 0
                        }}
                      />
                      <span>{col}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Size Option Selector */}
          {availableSizesForSelectedColour && availableSizesForSelectedColour.length > 0 && availableSizesForSelectedColour[0] !== 'One size' && (
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
                {availableSizesForSelectedColour.map(sz => {
                  const avail = isSizeAvailable(sz)
                  return (
                    <button
                      key={sz}
                      type="button"
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
            {product.soldOut || product.variants.length === 0 ? (
              <span className="status-soldout">OUT OF STOCK / UNAVAILABLE</span>
            ) : selectedVariant ? (
              selectedVariant.inventoryQuantity > 0 ? (
                <span className="status-instock">
                  <Check size={12} /> IN STOCK ({selectedVariant.inventoryQuantity} {selectedVariant.inventoryQuantity === 1 ? 'UNIT' : 'UNITS'} REMAINING)
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
                onClick={() => setQuantity(q => Math.min(selectedVariant?.inventoryQuantity || 1, q + 1))}
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
              {addedNotice ? 'ADDED TO BAG' : canAddToCart ? 'ADD TO BAG' : (product.soldOut || product.variants.length === 0 ? 'OUT OF STOCK' : selectedVariant ? 'OUT OF STOCK' : 'SELECT OPTIONS')}
            </button>

            <button
              className={`wishlist-toggle-icon-btn ${wishlisted ? 'active' : ''}`}
              onClick={handleWishlistToggle}
              title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
            {wishlistNotice && (
              <span className="product-action-feedback" role="status">
                {wishlisted ? 'REMOVED FROM WISHLIST' : 'SAVED TO WISHLIST'}
              </span>
            )}
          </div>

          {canAddToCart && (
            <button
              className="dark-btn buy-now-btn"
              onClick={handleBuyNow}
              style={{
                width: '100%',
                minHeight: '48px',
                marginTop: '10px',
                padding: '14px 18px',
                fontSize: '11px',
                letterSpacing: '2px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <span>BUY NOW — DIRECT CHECKOUT</span>
              <span>→</span>
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

            <div className="accordion-item">
              <button
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Policy' ? '' : 'Policy')}
              >
                <span>RETURN &amp; REFUND INFORMATION</span>
                <span>{openAccordion === 'Policy' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Policy' && (
                <div className="accordion-content">
                  <p style={{ margin: '0 0 8px' }}>
                    Read our policy for reporting damaged, defective, incorrect, or missing products.
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--muted)' }}>
                    Please record a continuous unboxing video when opening your parcel to help our studio team verify any issues and assess your request.
                  </p>
                  <div>
                    <Link
                      href="/return-refund-policy"
                      style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline', letterSpacing: '0.5px' }}
                    >
                      READ POLICY →
                    </Link>
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
      <CheckoutPolicyModal
        isOpen={buyNowPolicyModalOpen}
        onClose={() => setBuyNowPolicyModalOpen(false)}
        onContinue={handleContinueBuyNowCheckout}
      />
    </div>
  )
}
