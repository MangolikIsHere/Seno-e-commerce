'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Product } from '@/lib/catalog'
import { ProductCard } from '@/components/ProductCard'

interface ProductCarouselProps {
  products: Product[]
  ariaLabel: string
  returnContext?: string
  promotionBadges?: Record<string, string | undefined>
  sectionId?: string
}

export function ProductCarousel({
  products,
  ariaLabel,
  returnContext,
  promotionBadges = {},
  sectionId,
}: ProductCarouselProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = railRef.current
    if (!el) return
    const tolerance = 8
    const hasOverflow = el.scrollWidth > el.clientWidth + tolerance
    setCanScrollLeft(el.scrollLeft > tolerance)
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = railRef.current
    if (!el) return

    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    // Re-check after images have started rendering
    const timer = setTimeout(checkScroll, 400)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      clearTimeout(timer)
    }
  }, [checkScroll, products])

  const handleScroll = (direction: 'left' | 'right') => {
    const el = railRef.current
    if (!el) return
    // Scroll by approximately 3 visible cards or 75% of viewport
    const scrollAmount = Math.max(el.clientWidth * 0.72, 280)
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="product-carousel-wrapper" style={{ position: 'relative' }}>
      {/* Subtle Desktop Navigation Arrows */}
      <button
        type="button"
        className={`carousel-nav-btn carousel-nav-prev ${canScrollLeft ? 'is-visible' : ''}`}
        aria-label={`Scroll ${ariaLabel} left`}
        onClick={() => handleScroll('left')}
        tabIndex={canScrollLeft ? 0 : -1}
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>

      <button
        type="button"
        className={`carousel-nav-btn carousel-nav-next ${canScrollRight ? 'is-visible' : ''}`}
        aria-label={`Scroll ${ariaLabel} right`}
        onClick={() => handleScroll('right')}
        tabIndex={canScrollRight ? 0 : -1}
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>

      {/* Main Product Rail */}
      <div
        ref={railRef}
        className="product-rail"
        aria-label={ariaLabel}
        tabIndex={0}
        id={sectionId ? `${sectionId}-rail` : undefined}
      >
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            promotionBadge={promotionBadges[product.id]}
            returnContext={returnContext}
          />
        ))}
      </div>
    </div>
  )
}

