'use client'

import React, { useEffect, useRef, useState } from 'react'
import { isSenoAndroidApp } from '@/lib/platform'

export function BrandIntro() {
  const [phase, setPhase] = useState<'playing' | 'exiting' | 'removed'>('playing')
  // Track whether we have already scheduled removal so re-renders from concurrent
  // auth/store hydration (which trigger React reconciliation) cannot delay the
  // timers by rescheduling them.
  const timersScheduled = useRef(false)

  useEffect(() => {
    // Android APK has native Android 12+ splash and overlay; do not show web splash.
    if (isSenoAndroidApp()) {
      setPhase('removed')
      return
    }

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('removed')
      return
    }

    // Guard: only schedule timers once — prevent re-scheduling if a parent
    // context (AuthProvider, StoreProvider) re-renders this component.
    if (timersScheduled.current) return
    timersScheduled.current = true

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
      // Belt-and-suspenders: inline style ensures no pointer events ever leak
      // through the overlay to underlying content, regardless of CSS animation
      // fill-mode timing gaps or specificity conflicts.
      style={{ pointerEvents: 'none' }}
    >
      <div className="intro-stage">
        <img className="intro-mark" src="/seno-splash-logo.png" alt="SENO Brand Mark" />
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
        // This button must still be clickable to dismiss — explicitly override
        // the parent's pointer-events: none only on this interactive element.
        style={{ pointerEvents: 'auto' }}
      >
        CLICK TO ENTER
      </button>
    </div>
  )
}
