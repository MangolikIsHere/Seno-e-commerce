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

    const exitTimer = setTimeout(() => {
      setPhase('exiting')
    }, 900)

    const removeTimer = setTimeout(() => {
      setPhase('removed')
    }, 1350)

    // Defensive fallback: guarantees the website is never blocked even if delays occur
    const fallbackTimer = setTimeout(() => {
      setPhase('removed')
    }, 1800)

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
        <img className="intro-mark" src="/brand/seno-mark.svg" alt="SENO" />
        <div className="intro-wordmark-wrap">
          <span className="intro-wordmark">SENO</span>
          <div className="intro-divider" />
        </div>
        <div className="intro-details">
          <span className="intro-tagline">EVERYDAY, ELEVATED.</span>
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
