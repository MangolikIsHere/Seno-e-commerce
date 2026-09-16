'use client'

import React, { useEffect, useState } from 'react'

export function BrandIntro() {
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState<'initial' | 'reveal' | 'exit'>('initial')

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      return
    }

    // Check if intro has already been displayed during this browser session
    try {
      const hasSeen = sessionStorage.getItem('seno_brand_intro_seen')
      if (hasSeen) {
        return
      }
    } catch {
      // Ignore sessionStorage access errors (e.g. strict privacy mode)
    }

    // Mark as seen immediately so navigating away won't re-trigger
    try {
      sessionStorage.setItem('seno_brand_intro_seen', 'true')
    } catch {}

    setVisible(true)

    // Sequence timing:
    // 0ms: Initial minimal dark frame
    // 150ms: Reveal wordmark + Studio detail (tracking expansion, subtle scale)
    // 1500ms: Begin unveil / lift transition
    // 2100ms: Unmount completely from DOM
    const t1 = setTimeout(() => {
      setPhase('reveal')
    }, 150)

    const t2 = setTimeout(() => {
      setPhase('exit')
    }, 1550)

    const t3 = setTimeout(() => {
      setVisible(false)
    }, 2150)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`seno-brand-intro ${phase === 'exit' ? 'intro-exiting' : ''}`}
      aria-hidden="true"
      onClick={() => setVisible(false)}
    >
      <div className={`intro-center-stage ${phase === 'reveal' ? 'stage-revealed' : ''}`}>
        <div className="intro-wordmark-container">
          <span className="intro-wordmark">SENO</span>
          <div className="intro-accent-line" />
        </div>
        <div className="intro-sub-line">
          <span className="intro-studio-tag">STUDIO / 01</span>
          <span className="intro-dot">·</span>
          <span className="intro-tagline">MUMBAI</span>
        </div>
      </div>
      <button 
        type="button" 
        className="intro-skip-hint"
        onClick={() => setVisible(false)}
        aria-label="Skip introduction"
      >
        CLICK ANYWHERE TO ENTER
      </button>
    </div>
  )
}
