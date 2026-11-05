'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Check,
  RotateCcw,
  Truck,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  AlertCircle,
  AlertTriangle,
  Copy,
  Sparkles,
  Share2,
  Zap
} from 'lucide-react'
import { money, Product } from '@/lib/catalog'
import { getColourSwatchHex, normalizeColourKey } from '@/lib/colours'
import { FREE_SIZE_CANONICAL, isFreeSize, formatSizeDisplay } from '@/lib/variants-shared'
import { calculateExpectedDeliveryDate, formatDeliveryByDate } from '@/lib/deliveryDate'
import { useStore } from '@/context/StoreContext'
import { ProductCard } from '@/components/ProductCard'
import { SizeGuideModal } from '@/components/SizeGuideModal'
import { SenoImage } from '@/components/SenoImage'
import { Promotion } from '@/lib/promotions-shared'
import { CheckoutPolicyModal } from '@/components/CheckoutPolicyModal'
import { ShareProductModal } from '@/components/ShareProductModal'

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

  const isOnlyFreeSize = useMemo(() => {
    return availableSizesForSelectedColour.length > 0 && availableSizesForSelectedColour.every(s => isFreeSize(s))
  }, [availableSizesForSelectedColour])

  const [selectedSize, setSelectedSize] = useState<string>(() => {
    if (availableSizesForSelectedColour.length === 1) {
      return availableSizesForSelectedColour[0]
    }
    const fs = availableSizesForSelectedColour.find(s => isFreeSize(s))
    if (fs && availableSizesForSelectedColour.length === 1) {
      return fs
    }
    return product.sizes.length === 1 ? product.sizes[0] : ''
  })

  const [activeImgIndex, setActiveImgIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [openAccordion, setOpenAccordion] = useState<string>('Details')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [buyNowPolicyModalOpen, setBuyNowPolicyModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [addedNotice, setAddedNotice] = useState(false)
  const [wishlistNotice, setWishlistNotice] = useState(false)
  const [copiedCoupon, setCopiedCoupon] = useState(false)
  const [backUrl, setBackUrl] = useState('/collections/all')
  const [showMobileSticky, setShowMobileSticky] = useState(false)
  const [isSubmittingCart, setIsSubmittingCart] = useState(false)
  const [isSubmittingBuyNow, setIsSubmittingBuyNow] = useState(false)
  const actionPanelRef = React.useRef<HTMLDivElement | null>(null)

  // Track scroll position to show mobile sticky purchase bar when main actions scroll off-screen
  useEffect(() => {
    if (typeof window === 'undefined') return
    const panel = actionPanelRef.current
    if (!panel) return

    const handleScroll = () => {
      if (window.innerWidth <= 850) {
        const rect = panel.getBoundingClientRect()
        setShowMobileSticky(rect.bottom < 60)
      } else {
        setShowMobileSticky(false)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  // Dynamic Expected Delivery Date (Asia/Kolkata calendar days)
  const deliveryDays = product.expectedDeliveryDays ?? 7
  const [deliveryDateText, setDeliveryDateText] = useState<string>(() => {
    return formatDeliveryByDate(calculateExpectedDeliveryDate(deliveryDays))
  })

  useEffect(() => {
    setDeliveryDateText(formatDeliveryByDate(calculateExpectedDeliveryDate(deliveryDays)))
  }, [deliveryDays])

  // Interactive PIN Code Delivery Checker
  const [pincode, setPincode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('seno_delivery_pincode') || ''
      } catch {
        return ''
      }
    }
    return ''
  })
  const [pincodeStatus, setPincodeStatus] = useState<'idle' | 'valid' | 'invalid'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('seno_delivery_pincode')
        return saved && /^\d{6}$/.test(saved) ? 'valid' : 'idle'
      } catch {
        return 'idle'
      }
    }
    return 'idle'
  })

  const handleCheckPincode = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const cleanPin = pincode.trim()
    if (/^\d{6}$/.test(cleanPin)) {
      setPincodeStatus('valid')
      try {
        sessionStorage.setItem('seno_delivery_pincode', cleanPin)
      } catch { }
    } else {
      setPincodeStatus('invalid')
    }
  }

  // Mobile touch gesture tracking for swipeable gallery
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)

  // Resolve active gallery images based on selectedColour
  const activeColourKey = selectedColour ? normalizeColourKey(selectedColour) : ''
  const colourSpecificImages = activeColourKey && product.colourImages?.[activeColourKey] && product.colourImages[activeColourKey].length > 0
    ? product.colourImages[activeColourKey]
    : null

  const galleryImages = useMemo(() => {
    const list = (colourSpecificImages || (product.images.length > 0 ? product.images : (product.image ? [product.image] : []))).filter(Boolean)
    return list.length > 0 ? list : [product.image].filter(Boolean)
  }, [colourSpecificImages, product.images, product.image])

  // Handle switching colour
  const handleSelectColour = (col: string) => {
    if (col === selectedColour) return
    setSelectedColour(col)
    setActiveImgIndex(0) // Immediately display that colour's primary image

    // If currently selected size is unavailable in the newly selected colour, safely adjust
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

  // Auto-select Free Size if it is the only size for the selected colour
  useEffect(() => {
    if (isOnlyFreeSize && (!selectedSize || !isFreeSize(selectedSize))) {
      setSelectedSize(availableSizesForSelectedColour[0] || FREE_SIZE_CANONICAL)
    }
  }, [isOnlyFreeSize, availableSizesForSelectedColour, selectedSize])

  // Reset active image index if out of bounds on colour change
  useEffect(() => {
    if (activeImgIndex >= galleryImages.length) {
      setActiveImgIndex(0)
    }
  }, [galleryImages.length, activeImgIndex])

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') handlePrevImage()
      if (e.key === 'ArrowRight') handleNextImage()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, galleryImages.length])

  const wishlisted = isWishlisted(product.slug)

  // Find currently selected variant (case-insensitive)
  const selectedVariant = product.variants.find(v =>
    (!selectedSize || (v.size || '').trim().toLowerCase() === selectedSize.trim().toLowerCase()) &&
    (!selectedColour || (v.colour || '').trim().toLowerCase() === selectedColour.trim().toLowerCase())
  )

  // Variant display price before unconditional promotion
  const displayPrice = selectedVariant?.priceOverride ?? product.price

  // Evaluate promotions:
  // Distinguish permanent product price reductions from promotional offers.
  // Do not display BOGO, coupon, min_cart_value, or min_quantity (> 1) discounts as unconditional product discounts.
  const isUnconditionalPromo = Boolean(
    applicablePromotion &&
    (applicablePromotion.type === 'percentage' || applicablePromotion.type === 'flat') &&
    (!applicablePromotion.min_cart_value || applicablePromotion.min_cart_value <= 0) &&
    (!applicablePromotion.min_quantity || applicablePromotion.min_quantity <= 1) &&
    !applicablePromotion.coupon_code
  )

  // Effective selling price:
  // If an unconditional promotion applies, compute the promotional price.
  // Otherwise, use displayPrice.
  const effectiveSellingPrice = isUnconditionalPromo && applicablePromotion
    ? (applicablePromotion.type === 'percentage'
      ? Math.round(displayPrice * (1 - applicablePromotion.discount_value / 100))
      : Math.max(0, displayPrice - applicablePromotion.discount_value))
    : displayPrice

  // Determine original MRP reference:
  // If product has a compareAtPrice higher than effective selling price, that is the original MRP.
  // If unconditional promotion is active on a product without compareAtPrice, displayPrice is the reference MRP.
  const referenceMrp = (product.compareAtPrice && product.compareAtPrice > effectiveSellingPrice)
    ? product.compareAtPrice
    : (isUnconditionalPromo && displayPrice > effectiveSellingPrice ? displayPrice : null)

  // Strict discount calculation and validation:
  // Only show the discount badge when MRP is greater than the selling price and both values are valid positive numbers.
  // Never display negative discounts, NaN, or misleading savings.
  const hasDiscount = Boolean(
    referenceMrp &&
    effectiveSellingPrice &&
    typeof referenceMrp === 'number' &&
    typeof effectiveSellingPrice === 'number' &&
    !isNaN(referenceMrp) &&
    !isNaN(effectiveSellingPrice) &&
    referenceMrp > effectiveSellingPrice &&
    effectiveSellingPrice > 0
  )

  const discountAmount = hasDiscount ? (referenceMrp! - effectiveSellingPrice) : 0
  const discountPercentage = hasDiscount ? Math.round((discountAmount / referenceMrp!) * 100) : 0

  // Touch swipe navigation for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX)
    setTouchEndX(null)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return
    const distance = touchStartX - touchEndX
    if (distance > 45) {
      handleNextImage()
    } else if (distance < -45) {
      handlePrevImage()
    }
  }

  const handlePrevImage = () => {
    if (galleryImages.length <= 1) return
    setActiveImgIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1))
  }

  const handleNextImage = () => {
    if (galleryImages.length <= 1) return
    setActiveImgIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0))
  }

  const handleCopyCoupon = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopiedCoupon(true)
        setTimeout(() => setCopiedCoupon(false), 2000)
      }).catch(() => { })
    }
  }

  const handleAddToCart = () => {
    if (!selectedVariant || selectedVariant.inventoryQuantity < quantity || isSubmittingCart) return
    setIsSubmittingCart(true)
    addToCart(product, selectedVariant, quantity)
    setAddedNotice(true)
    setTimeout(() => {
      setAddedNotice(false)
      setIsSubmittingCart(false)
    }, 2000)
  }

  const handleBuyNow = () => {
    if (!selectedVariant || selectedVariant.inventoryQuantity < quantity || isSubmittingBuyNow) return
    setIsSubmittingBuyNow(true)
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
    setIsSubmittingBuyNow(false)
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

  const categorySlug = (product as any).categorySlug ||
    (product.category ? product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '')

  return (
    <div className="product-detail-container">
      {/* 1. Category / Breadcrumb Navigation */}
      <nav className="product-breadcrumb-nav" aria-label="Breadcrumb navigation">
        <Link href={backUrl} onClick={handleBackToShop} className="breadcrumb-back-link">
          <ArrowLeft size={13} /> BACK TO SHOP
        </Link>
        {product.category && (
          <>
            <span className="breadcrumb-separator" aria-hidden="true">/</span>
            <Link
              href={`/collections/${categorySlug}`}
              className="breadcrumb-category-link"
            >
              {product.category}
            </Link>
          </>
        )}
      </nav>

      <div className="product-detail-grid">
        {/* Product Gallery */}
        <div className="product-gallery-view">
          {/* Thumbnails rail (vertical on desktop, horizontal on mobile) */}
          {galleryImages.length > 1 && (
            <div className="gallery-thumbnails-rail" role="tablist" aria-label="Product image thumbnails">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeImgIndex}
                  aria-label={`View image ${idx + 1} of ${galleryImages.length}`}
                  className={`thumb-btn ${idx === activeImgIndex ? 'active' : ''}`}
                  onClick={() => setActiveImgIndex(idx)}
                >
                  <SenoImage
                    src={imgUrl}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Visual Showcase */}
          <div className="gallery-main-wrapper">
            <div
              className="main-gallery-image"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => galleryImages.length > 0 && setLightboxOpen(true)}
              title="Click to inspect garment details in high resolution"
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
                    Studio piece awaiting imagery
                  </span>
                </div>
              ) : (
                <SenoImage
                  src={galleryImages[activeImgIndex] || product.image}
                  alt={`${product.name} — view ${activeImgIndex + 1} of ${galleryImages.length}${selectedColour ? ` in ${selectedColour}` : ''}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}

              {/* Prev / Next buttons when multiple images exist */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="gallery-nav-btn prev"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePrevImage()
                    }}
                    aria-label="Previous product image"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    className="gallery-nav-btn next"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleNextImage()
                    }}
                    aria-label="Next product image"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Zoom Inspect Trigger */}
              {galleryImages.length > 0 && (
                <button
                  type="button"
                  className="gallery-zoom-trigger"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxOpen(true)
                  }}
                  aria-label="Inspect garment in high resolution"
                  title="Inspect details"
                >
                  <Maximize2 size={15} />
                </button>
              )}

              {/* Image Counter Badge */}
              {galleryImages.length > 1 && (
                <span className="gallery-counter-badge" aria-hidden="true">
                  {activeImgIndex + 1} / {galleryImages.length}
                </span>
              )}
            </div>

            {/* Mobile Indicator Dots */}
            {galleryImages.length > 1 && (
              <div className="gallery-mobile-dots" aria-hidden="true">
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`gallery-mobile-dot ${idx === activeImgIndex ? 'active' : ''}`}
                    onClick={() => setActiveImgIndex(idx)}
                    aria-label={`Jump to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Information Sidebar */}
        <div className="product-info-sidebar">
          <div className="product-header">
            {/* Atelier / Brand Kicker & Share Option */}
            <div className="product-brand-row">
              <div className="product-brand-kicker">
                {product.seller?.slug ? (
                  <Link href={`/sellers/${product.seller.slug}`} className="product-brand-name">
                    {product.seller.store_name || 'SENO Studio'}
                  </Link>
                ) : (
                  <span className="product-brand-name">
                    {product.seller?.store_name || 'SENO Studio'}
                  </span>
                )}
                <span className="product-brand-badge">VERIFIED ATELIER</span>
                {product.category && (
                  <>
                    <span className="product-brand-separator">•</span>
                    <span className="product-brand-category">{product.category}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="product-share-btn"
                aria-label={`Share ${product.name}`}
              >
                <Share2 size={12} />
                <span>SHARE</span>
              </button>
            </div>

            {/* 2. Product Title */}
            <h1 className="product-title-detail">{product.name}</h1>

            {/* 3. Selling Price, Original MRP, Discount Badge, and Savings Text */}
            <div className="product-price-section">
              <div className="product-price-row">
                <span className="product-price-current">
                  {money(effectiveSellingPrice)}
                </span>

                {hasDiscount && (
                  <>
                    <span
                      className="product-price-compare"
                      aria-label={`Original MRP ${money(referenceMrp!)}`}
                    >
                      {money(referenceMrp!)}
                    </span>
                    <span
                      className="product-discount-tag"
                      aria-label={`${discountPercentage}% discount`}
                    >
                      ({discountPercentage}% OFF)
                    </span>
                  </>
                )}
              </div>

              <div className="product-savings-row">
                <span className="product-tax-inclusive">MRP incl. of all taxes</span>
                {hasDiscount && (
                  <>
                    <span className="product-savings-separator">•</span>
                    <span
                      className="product-savings-text"
                      role="status"
                      aria-label={`You save ${money(discountAmount)} on this item`}
                    >
                      Save {money(discountAmount)}
                    </span>
                  </>
                )}
              </div>

              {isUnconditionalPromo && applicablePromotion && (
                <div style={{ marginTop: '6px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--clay)', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    ✦ Promotional offer included: {applicablePromotion.name}
                  </span>
                </div>
              )}
            </div>

            {/* Promotional Messaging & Conditional Offer Banners */}
            {applicablePromotion && !isUnconditionalPromo && (
              <div className="luxury-promo-strip">
                <div className="luxury-promo-header">
                  <span className="luxury-promo-tag">EXCLUSIVE OFFER</span>
                  <span className="luxury-promo-title">
                    {applicablePromotion.type === 'bogo'
                      ? 'Buy 1, Get 1 Complimentary'
                      : applicablePromotion.coupon_code
                        ? `Save ${applicablePromotion.type === 'percentage' ? `${applicablePromotion.discount_value}%` : `₹${applicablePromotion.discount_value}`}${applicablePromotion.min_cart_value ? ` above ₹${applicablePromotion.min_cart_value.toLocaleString('en-IN')}` : ''}`
                        : applicablePromotion.min_cart_value
                          ? `${applicablePromotion.type === 'percentage' ? `${applicablePromotion.discount_value}% OFF` : `₹${applicablePromotion.discount_value} OFF`} above ₹${applicablePromotion.min_cart_value.toLocaleString('en-IN')}`
                          : `Save ${applicablePromotion.discount_value}% on multi-buy`}
                  </span>
                </div>
                <p className="luxury-promo-desc">
                  {applicablePromotion.type === 'bogo'
                    ? 'Add 2 eligible items from this curation to your bag; lowest-priced piece is automatically complimentary.'
                    : applicablePromotion.coupon_code
                      ? `Apply voucher code ${applicablePromotion.coupon_code} at checkout.`
                      : applicablePromotion.min_cart_value
                        ? `Automatically applied once your bag total reaches ₹${applicablePromotion.min_cart_value.toLocaleString('en-IN')}.`
                        : `Add ${applicablePromotion.min_quantity || 2}+ items to receive this benefit.`}
                </p>
                {applicablePromotion.coupon_code && (
                  <div className="coupon-copy-row">
                    <button
                      type="button"
                      className="coupon-copy-btn"
                      onClick={() => handleCopyCoupon(applicablePromotion.coupon_code!)}
                      title="Copy coupon code"
                    >
                      {copiedCoupon ? (
                        <>
                          <Check size={12} color="#8c7355" />
                          <span style={{ color: '#8c7355' }}>COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>CODE: {applicablePromotion.coupon_code}</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Colour Option Selector */}
          {product.colors && product.colors.length > 0 && product.colors[0] !== 'Default' && (
            <div className="product-option-section">
              <div className="product-option-label">
                <span className="option-title">COLOUR</span>
                <span className="option-sep">—</span>
                <strong className="selected-option-value">{selectedColour || 'SELECT COLOUR'}</strong>
              </div>
              <div
                className="pure-swatches-grid"
                role="radiogroup"
                aria-label="Select Colour"
              >
                {product.colors.map(col => {
                  const avail = isColourAvailable(col)
                  const swatchHex = product.colourGroups?.find(g => normalizeColourKey(g.colour) === normalizeColourKey(col))?.swatch ||
                    product.colourHexes?.[normalizeColourKey(col)] ||
                    getColourSwatchHex(col)
                  const isSelected = selectedColour?.trim().toLowerCase() === col.trim().toLowerCase()
                  const isWhite = swatchHex.toLowerCase() === '#ffffff' || swatchHex.toLowerCase() === '#fff'
                  return (
                    <button
                      key={col}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={!avail}
                      aria-label={`${col}${!avail ? ' - Out of Stock' : ''}`}
                      className={`pure-swatch-btn ${isSelected ? 'selected' : ''} ${!avail ? 'out-of-stock' : ''}`}
                      onClick={() => handleSelectColour(col)}
                      title={`${col}${!avail ? ' (Out of stock)' : ''}`}
                    >
                      <span
                        className="pure-swatch-circle"
                        style={{
                          backgroundColor: swatchHex,
                          boxShadow: isWhite ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : undefined
                        }}
                      />
                      <span className="sr-only">{col}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 4. Size Option Selector */}
          {availableSizesForSelectedColour && availableSizesForSelectedColour.length > 0 && availableSizesForSelectedColour[0] !== 'One size' && (
            <div className="product-option-section">
              <div className="product-option-label">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="option-title">SIZE</span>
                  <span className="option-sep">—</span>
                  <strong className="selected-option-value">{formatSizeDisplay(selectedSize) || 'SELECT SIZE'}</strong>
                </div>
                {!isOnlyFreeSize && (
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="size-guide-trigger"
                    aria-haspopup="dialog"
                  >
                    SIZE GUIDE
                  </button>
                )}
              </div>
              <div
                className="pure-sizes-grid"
                role="radiogroup"
                aria-label="Select Size"
              >
                {availableSizesForSelectedColour.map(sz => {
                  const avail = isSizeAvailable(sz)
                  const isSelected = selectedSize === sz || (isOnlyFreeSize && isFreeSize(sz))
                  const displayLabel = formatSizeDisplay(sz)
                  return (
                    <button
                      key={sz}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={!avail}
                      aria-label={`Size ${displayLabel}${!avail ? ' - Out of Stock' : ''}`}
                      className={`pure-size-chip ${isSelected ? 'selected' : ''} ${!avail ? 'out-of-stock' : ''}`}
                      onClick={() => setSelectedSize(sz)}
                    >
                      {displayLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 5. Editorial Stock Availability Status */}
          <div className="editorial-stock-status">
            {product.soldOut || product.variants.length === 0 ? (
              <span className="stock-state soldout" role="status">
                <span className="stock-dot" /> Currently unavailable in all selections
              </span>
            ) : selectedVariant ? (
              selectedVariant.inventoryQuantity <= 0 ? (
                <span className="stock-state soldout" role="status">
                  <span className="stock-dot" /> Selected size &amp; colour currently out of stock
                </span>
              ) : selectedVariant.inventoryQuantity <= 5 ? (
                <span className="stock-state lowstock" role="status">
                  <span className="stock-dot" /> Only {selectedVariant.inventoryQuantity} {selectedVariant.inventoryQuantity === 1 ? 'piece' : 'pieces'} remaining in studio stock
                </span>
              ) : (
                <span className="stock-state instock" role="status">
                  <span className="stock-dot" /> In stock • Ready to dispatch
                </span>
              )
            ) : (
              <span className="stock-state prompt">
                Select colour and size to check availability
              </span>
            )}
          </div>

          {/* 6 & 7. Quantity Selector, Add to Bag, Wishlist Actions & Buy Now */}
          <div className="product-action-panel" ref={actionPanelRef}>
            <div className="purchase-primary-row">
              <div className="quantity-stepper" aria-label="Quantity Selector">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus size={13} />
                </button>
                <span aria-live="polite" aria-label={`Quantity ${quantity}`}>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(selectedVariant?.inventoryQuantity || 1, q + 1))}
                  disabled={!selectedVariant || quantity >= selectedVariant.inventoryQuantity}
                  aria-label="Increase quantity"
                >
                  <Plus size={13} />
                </button>
              </div>

              <button
                type="button"
                className="add-to-cart-btn"
                disabled={!canAddToCart || isSubmittingCart}
                onClick={handleAddToCart}
              >
                {addedNotice ? (
                  <>
                    <Check size={14} /> ADDED TO BAG
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} />
                    {canAddToCart
                      ? (isSubmittingCart ? 'ADDING...' : 'ADD TO BAG')
                      : (product.soldOut || product.variants.length === 0
                        ? 'OUT OF STOCK'
                        : selectedVariant
                          ? 'OUT OF STOCK'
                          : 'SELECT SIZE')}
                  </>
                )}
              </button>

              <button
                type="button"
                className={`wishlist-toggle-icon-btn ${wishlisted ? 'active' : ''}`}
                onClick={handleWishlistToggle}
                title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Buy Now Direct Checkout Row */}
            {canAddToCart && (
              <button
                type="button"
                className="buy-now-btn"
                disabled={isSubmittingBuyNow}
                onClick={handleBuyNow}
                aria-label="Buy now with direct checkout"
              >
                <span className="buy-now-content">
                  <Zap size={14} className="buy-now-icon" fill="currentColor" />
                  <span className="buy-now-label">
                    {isSubmittingBuyNow ? 'OPENING INSTANT CHECKOUT...' : 'BUY NOW — DIRECT CHECKOUT'}
                  </span>
                </span>
                <span className="buy-now-badge" aria-hidden="true">
                  INSTANT
                </span>
              </button>
            )}

            {wishlistNotice && (
              <span className="product-action-feedback" role="status" aria-live="polite">
                {wishlisted ? 'REMOVED FROM WISHLIST' : 'SAVED TO WISHLIST'}
              </span>
            )}
          </div>

          {/* 8. Delivery Information & Interactive Pincode Checker */}
          <div className="product-delivery-card">
            <div className="delivery-card-header">
              <div className="delivery-icon-wrap">
                <Truck size={17} className="delivery-icon" />
              </div>
              <div className="delivery-header-text">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="delivery-title">EXPECTED DELIVERY</span>
                  <span className="delivery-speed-tag">EXPRESS DISPATCH</span>
                </div>
                <strong className="delivery-date-highlight">{deliveryDateText}</strong>
              </div>
            </div>

            {/* Pincode verification row */}
            <form onSubmit={handleCheckPincode} className="pincode-check-form">
              <div className="pincode-input-wrapper">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN code"
                  value={pincode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setPincode(val)
                    if (pincodeStatus !== 'idle') setPincodeStatus('idle')
                  }}
                  className={`pincode-input ${pincodeStatus === 'invalid' ? 'error' : ''}`}
                  aria-label="Enter PIN code for delivery estimate"
                />
                <button type="submit" className="pincode-submit-btn">
                  CHECK
                </button>
              </div>
              {pincodeStatus === 'valid' && (
                <span className="pincode-feedback success">
                  <Check size={12} /> Delivering to {pincode} • Express Consignment Available
                </span>
              )}
              {pincodeStatus === 'invalid' && (
                <span className="pincode-feedback error">
                  Please enter a valid 6-digit postal PIN code
                </span>
              )}
            </form>

            <div className="delivery-benefits-list">
              <div className="benefit-row">
                <span className="benefit-bullet">•</span>
                <span>
                  {product.shippingMethod === 'custom' && product.customDeliveryCharge !== undefined
                    ? (product.customDeliveryCharge === 0 ? 'Complimentary express studio delivery.' : `₹${product.customDeliveryCharge} flat consignment delivery across India.`)
                    : 'Complimentary express shipping on orders above ₹1,999 across India.'}
                </span>
              </div>
              <div className="benefit-row">
                <span className="benefit-bullet">•</span>
                <span>Dispatched within 24–48 hours in signature museum archival packaging.</span>
              </div>
            </div>
          </div>

          {/* 9. Product Details, Materials, Delivery, Returns & Atelier Accordions */}
          <div className="product-accordion-group">
            <div className="accordion-item">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Details' ? '' : 'Details')}
                aria-expanded={openAccordion === 'Details'}
              >
                <span>DESCRIPTION &amp; DETAILS</span>
                <span aria-hidden="true">{openAccordion === 'Details' ? '−' : '+'}</span>
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
                type="button"
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Care' ? '' : 'Care')}
                aria-expanded={openAccordion === 'Care'}
              >
                <span>FABRIC &amp; MATERIALS</span>
                <span aria-hidden="true">{openAccordion === 'Care' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Care' && (
                <div className="accordion-content">
                  <p>
                    Crafted with premium fibers and considered finishing to ensure longevity and superior drape.
                  </p>
                  <ul>
                    <li>Professional dry cleaning recommended for structured and embroidered silhouettes.</li>
                    <li>For casual cotton and linen separates, hand wash gently in cold water with mild liquid detergent.</li>
                    <li>Do not bleach or wring vigorously. Line dry flat in natural shade.</li>
                    <li>Warm steam iron on reverse side to restore natural texture.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="accordion-item">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Shipping' ? '' : 'Shipping')}
                aria-expanded={openAccordion === 'Shipping'}
              >
                <span>SHIPPING, DELIVERY &amp; PACKAGING</span>
                <span aria-hidden="true">{openAccordion === 'Shipping' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Shipping' && (
                <div className="accordion-content">
                  <p>
                    Complimentary express shipping on all orders over ₹1,999 across India. Standard orders dispatched within 24–48 hours in signature museum-grade archival packaging.
                  </p>
                  <p>
                    Estimated arrival within <strong>{deliveryDays} calendar days</strong> ({deliveryDateText}) to verified delivery pin codes.
                  </p>
                </div>
              )}
            </div>

            <div className="accordion-item">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Returns' ? '' : 'Returns')}
                aria-expanded={openAccordion === 'Returns'}
              >
                <span>RETURNS &amp; GUARANTEE</span>
                <span aria-hidden="true">{openAccordion === 'Returns' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Returns' && (
                <div className="accordion-content">
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ display: 'block', color: 'var(--ink)', marginBottom: '4px' }}>
                      {product.returnPolicy?.isReturnable
                        ? `${product.returnPolicy.returnWindowDays}-Day SENO Quality Guarantee`
                        : 'Studio Specialty Piece — Final Sale'}
                    </strong>
                    <p style={{ margin: 0 }}>
                      {product.returnPolicy?.isReturnable
                        ? product.returnPolicy.returnPolicyNotes || 'Complimentary reverse doorstep pickup across India. Garments must be unworn with original tags.'
                        : 'This curated specialty piece cannot be returned or exchanged once dispatched.'}
                    </p>
                  </div>
                  <div>
                    <Link
                      href="/return-refund-policy"
                      style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline', letterSpacing: '0.5px' }}
                    >
                      READ COMPREHENSIVE RETURN &amp; REFUND POLICY →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="accordion-item">
              <button
                type="button"
                className="accordion-header"
                onClick={() => setOpenAccordion(openAccordion === 'Atelier' ? '' : 'Atelier')}
                aria-expanded={openAccordion === 'Atelier'}
              >
                <span>ATELIER DETAILS &amp; AUTHENTICITY</span>
                <span aria-hidden="true">{openAccordion === 'Atelier' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Atelier' && (
                <div className="accordion-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <strong style={{ color: 'var(--ink)', letterSpacing: '0.5px' }}>
                      {product.seller?.store_name || 'SENO Studio'}
                    </strong>
                    <span style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8c7355', background: '#f7f4ed', padding: '1px 6px', borderRadius: '2px', border: '1px solid #e7ded3' }}>
                      Verified Atelier
                    </span>
                  </div>
                  <p style={{ margin: '0 0 10px' }}>
                    Direct designer fulfillment. Every creation undergoes meticulous quality inspection before consignment dispatch.
                  </p>
                  <ul>
                    <li>100% Authentic Designer Silhouette</li>
                    <li>Museum-Grade Archival Presentation</li>
                    <li>Inspected and authenticated by SENO Quality Standards</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for High-Resolution Detail Inspection */}
      {lightboxOpen && galleryImages.length > 0 && (
        <div
          className="gallery-lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution image inspection"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="gallery-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="gallery-lightbox-close"
              onClick={() => setLightboxOpen(false)}
              aria-label="Close image inspection"
            >
              <X size={16} /> CLOSE (ESC)
            </button>

            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  className="gallery-nav-btn prev"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  style={{ left: '-18px' }}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="gallery-nav-btn next"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  style={{ right: '-18px' }}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}

            <img
              src={galleryImages[activeImgIndex]}
              alt={`${product.name} detail view ${activeImgIndex + 1}`}
              style={{
                maxWidth: '85vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                borderRadius: '2px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
            />
          </div>
        </div>
      )}

      {/* Curated Selection / Related Products */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section" style={{ marginTop: '64px' }}>
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

      {/* Mobile Floating Sticky Purchase Bar */}
      {showMobileSticky && (
        <aside className="mobile-sticky-purchase-bar" aria-label="Quick bag actions">
          <div className="sticky-bar-product">
            <div className="sticky-bar-thumb">
              <SenoImage
                src={galleryImages[0] || product.image}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="sticky-bar-info">
              <span className="sticky-bar-name">{product.name}</span>
              <div className="sticky-bar-pricing">
                <span className="sticky-bar-current-price">{money(effectiveSellingPrice)}</span>
                {hasDiscount && (
                  <span className="sticky-bar-compare-price">{money(referenceMrp!)}</span>
                )}
                {(selectedColour || selectedSize) && (
                  <span className="sticky-bar-selected-variant">
                    {[selectedColour, formatSizeDisplay(selectedSize)].filter(Boolean).join(' • ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="sticky-bar-actions">
            <button
              type="button"
              className={`sticky-bar-wishlist-btn ${wishlisted ? 'active' : ''}`}
              onClick={handleWishlistToggle}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            >
              <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>

            <button
              type="button"
              className="sticky-bar-add-btn"
              disabled={!canAddToCart || isSubmittingCart}
              onClick={handleAddToCart}
            >
              {addedNotice ? (
                <>
                  <Check size={13} /> ADDED
                </>
              ) : (
                <>
                  <ShoppingBag size={13} />
                  {canAddToCart ? 'ADD TO BAG' : 'OUT OF STOCK'}
                </>
              )}
            </button>

            {canAddToCart && (
              <button
                type="button"
                className="sticky-bar-buy-btn"
                disabled={isSubmittingBuyNow}
                onClick={handleBuyNow}
                aria-label="Direct checkout"
              >
                <Zap size={12} fill="currentColor" />
                <span>BUY NOW</span>
              </button>
            )}
          </div>
        </aside>
      )}

      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
      <CheckoutPolicyModal
        isOpen={buyNowPolicyModalOpen}
        onClose={() => setBuyNowPolicyModalOpen(false)}
        onContinue={handleContinueBuyNowCheckout}
      />
      <ShareProductModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        product={{
          name: product.name,
          slug: product.slug,
          price: effectiveSellingPrice,
          compareAtPrice: referenceMrp,
          image: galleryImages[0] || product.image,
          images: galleryImages,
          description: product.description,
          category: product.category,
          selectedColour: selectedColour
        }}
      />
    </div>
  )
}
