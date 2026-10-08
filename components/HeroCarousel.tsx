'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { Promotion } from '@/lib/promotions-shared'

export interface HeroSlide {
  id: string
  badge?: string
  headline: React.ReactNode
  subheading?: string
  ctaText: string
  ctaLink: string
  imageUrl: string
  imageAlt: string
  isPrimaryCampaign?: boolean
}

interface HeroCarouselProps {
  featuredPromotions?: Promotion[]
}

const DEFAULT_BRAND_SLIDE: HeroSlide = {
  id: 'seno-ss26-default',
  badge: 'SPRING / SUMMER 26',
  headline: (
    <>
      New forms
      <br />
      for everyday.
    </>
  ),
  subheading: 'Considered clothing for everyday life.',
  ctaText: 'SHOP NOW',
  ctaLink: '/collections/new-arrivals',
  imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85',
  imageAlt: 'SENO Spring / Summer 26 Campaign',
  isPrimaryCampaign: true
}

export function HeroCarousel({ featuredPromotions = [] }: HeroCarouselProps) {
  // Construct all slides: Slide 1 is always the primary SENO brand campaign
  const promoSlides: HeroSlide[] = featuredPromotions.map(promo => ({
    id: promo.id,
    badge: promo.hero_badge || 'LIMITED OFFER',
    headline: promo.hero_headline || promo.name.toUpperCase(),
    subheading: promo.hero_subheading || promo.description || undefined,
    ctaText: promo.hero_cta_text || 'SHOP THE OFFER',
    ctaLink: `/offers/${promo.slug}`,
    imageUrl:
      promo.hero_image_url ||
      'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85',
    imageAlt: promo.name
  }))

  const allSlides: HeroSlide[] = [DEFAULT_BRAND_SLIDE, ...promoSlides].slice(0, 5)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
  }, [])

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % allSlides.length)
  }, [allSlides.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + allSlides.length) % allSlides.length)
  }, [allSlides.length])

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx)
    setIsPaused(true) // Pause on intentional user interaction
  }

  // Autoplay management
  useEffect(() => {
    if (allSlides.length <= 1 || isPaused || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      nextSlide()
    }, 6000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [allSlides.length, isPaused, prefersReducedMotion, nextSlide])

  // Touch handlers for mobile swipe
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
    const isSwipeLeft = distance > 45
    const isSwipeRight = distance < -45

    if (isSwipeLeft) {
      nextSlide()
      setIsPaused(true)
    } else if (isSwipeRight) {
      prevSlide()
      setIsPaused(true)
    }
    setTouchStartX(null)
    setTouchEndX(null)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      nextSlide()
      setIsPaused(true)
    } else if (e.key === 'ArrowLeft') {
      prevSlide()
      setIsPaused(true)
    }
  }

  return (
    <section
      className="hero-section hero-carousel-container"
      role="region"
      aria-roledescription="carousel"
      aria-label="SENO Brand Campaigns and Featured Offers"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        overflow: 'hidden',
        outline: 'none'
      }}
    >
      {/* Slides Container */}
      <div className="hero-slides-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {allSlides.map((slide, idx) => {
          const isActive = idx === currentIndex
          return (
            <div
              key={slide.id}
              className={`hero-slide-pane ${isActive ? 'active' : ''}`}
              aria-hidden={!isActive}
              style={{
                position: idx === 0 ? 'relative' : 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
                transition: prefersReducedMotion ? 'none' : 'opacity 0.7s cubic-bezier(0.2, 0, 0.2, 1)',
                zIndex: isActive ? 1 : 0
              }}
            >
              {/* Background Image */}
              <div className="hero-image-wrapper">
                <img
                  src={slide.imageUrl}
                  alt={slide.imageAlt}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                  decoding={idx === 0 ? 'sync' : 'async'}
                  fetchPriority={idx === 0 ? 'high' : 'auto'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: isActive && !prefersReducedMotion ? 'scale(1)' : 'scale(1.02)',
                    transition: 'transform 6s ease-out'
                  }}
                />
              </div>

              {/* Editorial Overlay */}
              <div className="hero-content-overlay">
                {slide.badge && (
                  <span className="hero-season-kicker">
                    {slide.badge}
                  </span>
                )}

                <h1 className="hero-headline">
                  {slide.headline}
                </h1>

                {slide.subheading && (
                  <p className="hero-subheading-editorial">
                    {slide.subheading}
                  </p>
                )}

                <Link href={slide.ctaLink} className="hero-cta-btn">
                  {slide.ctaText} <span>→</span>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation Arrows (Visible only if multiple slides) */}
      {allSlides.length > 1 && (
        <>
          <button
            type="button"
            className="hero-nav-arrow hero-nav-prev"
            onClick={e => {
              e.preventDefault()
              prevSlide()
              setIsPaused(true)
            }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            className="hero-nav-arrow hero-nav-next"
            onClick={e => {
              e.preventDefault()
              nextSlide()
              setIsPaused(true)
            }}
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>

          {/* Pagination Indicators & Play/Pause */}
          <div className="hero-carousel-pagination" aria-label="Slide indicators">
            <div className="hero-dots-track">
              {allSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`hero-dot-indicator ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${slide.badge || 'Offer'}`}
                  aria-current={idx === currentIndex ? 'true' : 'false'}
                >
                  <span className="hero-dot-bar" />
                </button>
              ))}
            </div>

            <button
              type="button"
              className="hero-play-pause-btn"
              onClick={() => setIsPaused(!isPaused)}
              aria-label={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
              title={isPaused ? 'Resume autoplay' : 'Pause autoplay'}
            >
              {isPaused ? <Play size={10} fill="currentColor" /> : <Pause size={10} fill="currentColor" />}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
