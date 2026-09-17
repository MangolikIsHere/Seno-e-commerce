'use client'

import React, { useEffect, useState } from 'react'

export function BrandIntro() {
  const [phase, setPhase] = useState<'playing' | 'exiting' | 'removed'>('playing')

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('removed')
      return
    }

    // Sequence orchestration:
    // 0.00s - 1.60s: Brand presentation (SENO wordmark + STUDIO / 01 reveals via CSS)
    // 1.60s: Smooth veil-lift dissolve begins
    // 2.15s: Element cleanly unmounts from DOM
    const exitTimer = setTimeout(() => {
      setPhase('exiting')
    }, 1600)

    const removeTimer = setTimeout(() => {
      setPhase('removed')
    }, 2150)

    // Defensive fallback: guarantees the website is never blocked even if delays occur
    const fallbackTimer = setTimeout(() => {
      setPhase('removed')
    }, 2800)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(removeTimer)
      clearTimeout(fallbackTimer)
    }
  }, [])

  if (phase === 'removed') {
    return null
  }

  return (
    <div
      id="seno-brand-intro"
      className={`seno-brand-intro ${phase === 'exiting' ? 'intro-exiting' : ''}`}
      aria-hidden="true"
      onClick={() => setPhase('removed')}
    >
      <div className="intro-stage">
        <div className="intro-wordmark-wrap">
          <span className="intro-wordmark">SENO</span>
          <div className="intro-divider" />
        </div>
        <div className="intro-details">
          <span className="intro-studio">STUDIO / 01</span>
          <span className="intro-sep">·</span>
          <span className="intro-loc">MUMBAI</span>
        </div>
      </div>
      <button 
        type="button" 
        className="intro-dismiss-btn"
        onClick={() => setPhase('removed')}
        aria-label="Enter store immediately"
      >
        CLICK TO ENTER
      </button>
    </div>
  )
}
