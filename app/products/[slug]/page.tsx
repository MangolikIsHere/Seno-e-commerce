'use client'

import React, { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag, Check } from 'lucide-react'
import { getProduct, getRelatedProducts, money, Product } from '@/lib/catalog'
import { useStore } from '@/context/StoreContext'
import { ProductCard } from '@/components/ProductCard'
import { SizeGuideModal } from '@/components/SizeGuideModal'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

export default function ProductPage({ params }: ProductPageProps) {
  const { slug } = use(params)
  const router = useRouter()
  const { addToCart, toggleWishlist, isWishlisted } = useStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [activeImgIndex, setActiveImgIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [openAccordion, setOpenAccordion] = useState<string>('Details')
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)
  const [addedNotice, setAddedNotice] = useState(false)

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const p = await getProduct(slug)
      if (p) {
        setProduct(p)
        const rp = await getRelatedProducts(p, 4)
        setRelatedProducts(rp)
      } else {
        setProduct(null)
      }
      setLoading(false)
    }
    fetchData()
  }, [slug])

  if (loading) {
    return <div className="static-page-container" style={{ minHeight: '60vh', padding: '100px 20px', textAlign: 'center' }}>Loading product details...</div>
  }

  if (!product) {
    return (
      <main className="static-page-container" style={{ minHeight: '60vh', textAlign: 'center' }}>
        <span className="section-kicker">404 / SENO STUDIO</span>
        <h1 className="static-page-title">
          THIS PIECE
          <br />
          <em>ISN&apos;T HERE.</em>
        </h1>
        <p style={{ marginBottom: '30px' }}>The requested product piece could not be found in our current catalog.</p>
        <Link href="/collections/all" className="dark-btn" style={{ padding: '14px 28px' }}>
          RETURN TO SHOP
        </Link>
      </main>
    )
  }

  const wishlisted = isWishlisted(product.slug)
  const galleryImages = product.images.length > 0 ? product.images : [product.image]

  const handleAddToCart = () => {
    if (!selectedSize) return
    addToCart(product, selectedSize, quantity)
    setAddedNotice(true)
    setTimeout(() => setAddedNotice(false), 2500)
  }

  const handleBuyNow = () => {
    if (!selectedSize) return
    addToCart(product, selectedSize, quantity)
    router.push('/cart')
  }

  return (
    <div className="product-detail-container">
      <Link href="/collections/all" className="breadcrumb-back-link">
        <ArrowLeft size={13} /> BACK TO SHOP
      </Link>

      <div className="product-detail-grid">
        {/* Gallery */}
        <div className="product-gallery-view">
          <div className="main-gallery-image">
            <img src={galleryImages[activeImgIndex]} alt={product.name} />
          </div>

          {galleryImages.length > 1 && (
            <div className="gallery-thumbnails-row">
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  className={`thumb-btn ${activeImgIndex === idx ? 'active' : ''}`}
                  onClick={() => setActiveImgIndex(idx)}
                >
                  <img src={imgUrl} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info-panel">
          <span className="section-kicker">{product.category} / SENO STUDIO</span>
          <h1 className="product-detail-title">{product.name}</h1>

          <div className="product-detail-price">
            <span>{money(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="compare-price">{money(product.compareAtPrice)}</span>
            )}
          </div>

          <p className="product-detail-desc">{product.description}</p>

          <div className="detail-section-divider" />

          {/* Color */}
          <div className="option-label-row">
            <span>COLOUR</span>
            <strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{product.color}</strong>
          </div>

          {/* Size Selector */}
          <div className="option-label-row" style={{ marginTop: '20px' }}>
            <span>SELECT SIZE</span>
            <button className="size-guide-trigger" onClick={() => setSizeGuideOpen(true)}>
              SIZE GUIDE
            </button>
          </div>

          <div className="size-selector-grid">
            {product.sizes.map(sz => (
              <button
                key={sz}
                className={`size-option-pill ${selectedSize === sz ? 'selected' : ''}`}
                onClick={() => setSelectedSize(sz)}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div className="quantity-picker-row">
            <span className="option-label-row" style={{ margin: 0 }}>QUANTITY</span>
            <div className="quantity-stepper-box">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                <Minus size={13} />
              </button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="detail-actions-stack">
            <button
              className="add-to-bag-btn dark-btn"
              disabled={product.soldOut || !selectedSize}
              onClick={handleAddToCart}
            >
              {addedNotice ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} /> ADDED TO BAG
                </span>
              ) : product.soldOut ? (
                'SOLD OUT'
              ) : selectedSize ? (
                `ADD TO BAG — ${money(product.price * quantity)}`
              ) : (
                'SELECT A SIZE'
              )}
            </button>

            <button
              className="buy-now-btn outline-btn"
              disabled={product.soldOut || !selectedSize}
              onClick={handleBuyNow}
            >
              BUY NOW
            </button>

            <button
              className="wishlist-detail-btn"
              onClick={() => toggleWishlist(product.slug)}
            >
              <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} color={wishlisted ? 'var(--clay)' : 'currentColor'} />
              {wishlisted ? 'Saved in wishlist' : 'Add to wishlist'}
            </button>
          </div>

          {/* Accordions */}
          <div className="accordions-container">
            {/* Description Accordion */}
            <div className="accordion-item">
              <button
                className="accordion-header-btn"
                onClick={() => setOpenAccordion(openAccordion === 'Description' ? '' : 'Description')}
              >
                <span>DESCRIPTION</span>
                <span>{openAccordion === 'Description' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Description' && (
                <p className="accordion-body-text">{product.description}</p>
              )}
            </div>

            {/* Details Accordion */}
            <div className="accordion-item">
              <button
                className="accordion-header-btn"
                onClick={() => setOpenAccordion(openAccordion === 'Details' ? '' : 'Details')}
              >
                <span>DETAILS & SPECIFICATIONS</span>
                <span>{openAccordion === 'Details' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Details' && (
                <div className="accordion-body-text">
                  {product.details && product.details.length > 0 ? (
                    <ul style={{ paddingLeft: '18px', margin: 0 }}>
                      {product.details.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: 0 }}>Designed in Mumbai. Crafted with durable natural materials.</p>
                  )}
                </div>
              )}
            </div>

            {/* Shipping & Returns Accordion */}
            <div className="accordion-item">
              <button
                className="accordion-header-btn"
                onClick={() => setOpenAccordion(openAccordion === 'Shipping' ? '' : 'Shipping')}
              >
                <span>SHIPPING & RETURNS</span>
                <span>{openAccordion === 'Shipping' ? '−' : '+'}</span>
              </button>
              {openAccordion === 'Shipping' && (
                <p className="accordion-body-text">
                  Complimentary India shipping on orders over ₹1,999. Standard delivery takes 2–4 business days. Returns and size exchanges are accepted within 7 days of delivery.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* YOU MAY ALSO LIKE */}
      <section className="related-products-section">
        <div className="section-header-flex">
          <div>
            <span className="section-kicker">CURATED RECOMMENDATIONS</span>
            <h2 className="section-title">YOU MAY ALSO LIKE</h2>
          </div>
        </div>

        <div className="product-grid columns-4">
          {relatedProducts.map(item => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>

      {/* Size Guide Modal */}
      <SizeGuideModal isOpen={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} />
    </div>
  )
}
