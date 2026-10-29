'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { HeroSlideRecord, DEFAULT_HERO_SLIDE } from '@/lib/hero-slides-shared'
import { Promotion } from '@/lib/promotions-shared'

export interface HeroCarouselProps {
  slides?: HeroSlideRecord[]
  featuredPromotions?: Promotion[] // Maintained for backward compatibility
}

export function HeroCarousel({
  slides = [],
  featuredPromotions = []
}: HeroCarouselProps) {
  // Resolve active slides: prioritize explicit slides from HeroSlideRecord store
  const activeConfiguredSlides: HeroSlideRecord[] = useMemo(() => {
    if (slides && slides.length > 0) {
      const active = slides.filter(s => s.is_active)
      if (active.length > 0) {
        return [...active].sort((a, b) => (a.display_priority ?? 1) - (b.display_priority ?? 1))
      }
    }

    // Fallback: if no slides provided or all inactive, construct from featuredPromotions or default brand slide
    if (featuredPromotions && featuredPromotions.length > 0) {
      const promoSlides: HeroSlideRecord[] = featuredPromotions.map((promo, idx) => ({
        id: promo.id,
        title: promo.name,
        eyebrow: promo.hero_badge || 'LIMITED OFFER',
        headline: promo.hero_headline || promo.name.toUpperCase(),
        subheading: promo.hero_subheading || promo.description || null,
        cta_text: promo.hero_cta_text || 'SHOP THE OFFER',
        cta_link: `/offers/${promo.slug}`,
        image_url:
          promo.hero_image_url ||
          'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85',
        mobile_image_url: null,
        image_alt: (promo as any).hero_image_alt || `SENO Promotion — ${promo.name}`,
        image_focal_point: 'center',
        text_alignment: 'left',
        content_placement: 'bottom-left',
        overlay_opacity: 30,
        is_active: true,
        display_priority: idx + 2
      }))
      return [DEFAULT_HERO_SLIDE, ...promoSlides]
    }

    return [DEFAULT_HERO_SLIDE]
  }, [slides, featuredPromotions])

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

  // Safely clamp index if slide count changes
  useEffect(() => {
    if (currentIndex >= activeConfiguredSlides.length) {
      setCurrentIndex(0)
    }
  }, [activeConfiguredSlides.length, currentIndex])

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % activeConfiguredSlides.length)
  }, [activeConfiguredSlides.length])

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + activeConfiguredSlides.length) % activeConfiguredSlides.length)
  }, [activeConfiguredSlides.length])

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx)
    setIsPaused(true) // Pause on intentional user interaction
  }

  // Autoplay management
  useEffect(() => {
    if (activeConfiguredSlides.length <= 1 || isPaused || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      nextSlide()
    }, 6000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [activeConfiguredSlides.length, isPaused, prefersReducedMotion, nextSlide])

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
      aria-label="SENO Brand Campaigns and Featured Collections"
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
        {activeConfiguredSlides.map((slide, idx) => {
          const isActive = idx === currentIndex
          const headlineLines = (slide.headline || '').split('\n')

          // Dynamic placement mapping
          const placement = slide.content_placement || 'bottom-left'
          const textAlign = slide.text_alignment || 'left'

          let justifyContent = 'flex-end'
          let alignItems = 'flex-start'

          if (placement === 'center') {
            justifyContent = 'center'
            alignItems = 'center'
          } else if (placement === 'center-left') {
            justifyContent = 'center'
            alignItems = 'flex-start'
          } else if (placement === 'bottom-center') {
            justifyContent = 'flex-end'
            alignItems = 'center'
          }

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
              {/* Background Responsive Picture with Desktop / Mobile Source */}
              <div className="hero-image-wrapper">
                <picture style={{ width: '100%', height: '100%', display: 'block' }}>
                  {slide.mobile_image_url && (
                    <source media="(max-width: 768px)" srcSet={slide.mobile_image_url} />
                  )}
                  <img
                    src={slide.image_url}
                    alt={slide.image_alt || slide.title || 'SENO Campaign'}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding={idx === 0 ? 'sync' : 'async'}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: slide.image_focal_point || 'center',
                      transform: isActive && !prefersReducedMotion ? 'scale(1)' : 'scale(1.02)',
                      transition: 'transform 6s ease-out'
                    }}
                  />
                </picture>

                {/* Configurable Contrast Overlay */}
                <div
                  className="hero-overlay-tint"
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: `rgba(0, 0, 0, ${(slide.overlay_opacity ?? 25) / 100})`,
                    pointerEvents: 'none'
                  }}
                />
              </div>

              {/* Editorial Content Overlay */}
              <div
                className="hero-content-overlay"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent,
                  alignItems,
                  textAlign: textAlign as any
                }}
              >
                {slide.eyebrow && (
                  <span className="hero-season-kicker">
                    {slide.eyebrow}
                  </span>
                )}

                {idx === 0 ? (
                  <h1 className="hero-headline">
                    {headlineLines.map((line, lIdx) => (
                      <React.Fragment key={lIdx}>
                        {line}
                        {lIdx < headlineLines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </h1>
                ) : (
                  <h2 className="hero-headline">
                    {headlineLines.map((line, lIdx) => (
                      <React.Fragment key={lIdx}>
                        {line}
                        {lIdx < headlineLines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </h2>
                )}

                {slide.subheading && (
                  <p className="hero-subheading-editorial">
                    {slide.subheading}
                  </p>
                )}

                <Link
                  href={slide.cta_link || '/collections/all'}
                  className="hero-cta-btn"
                  style={{ alignSelf: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start' }}
                >
                  {slide.cta_text || 'SHOP NOW'} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation Arrows (Visible only if multiple slides) */}
      {activeConfiguredSlides.length > 1 && (
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
              {activeConfiguredSlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`hero-dot-indicator ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${slide.title || slide.eyebrow || 'Campaign'}`}
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
