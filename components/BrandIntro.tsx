'use client'

import React, { useEffect, useState } from 'react'

export function BrandIntro() {
  const [phase, setPhase] = useState<'playing' | 'exiting' | 'removed'>('playing')
  useEffect(() => {
    // Android APK has native Android 12+ splash and overlay; do not show web splash.
    // Use all available signals — the page may have just returned from a Google OAuth Custom Tabs
    // redirect, so the html class may not yet be set, but cookie / sessionStorage / UA always are.
    const isAndroid =
      document.documentElement.classList.contains('seno-android-app') ||
      window.navigator.userAgent.includes('SenoAndroidApp') ||
      (window as unknown as { SenoNativeApp?: unknown }).SenoNativeApp !== undefined ||
      document.cookie.includes('seno_platform=android') ||
      (() => {
        try { return sessionStorage.getItem('seno_platform') === 'android' } catch { return false }
      })() ||
      new URLSearchParams(window.location.search).get('platform') === 'android'

    if (isAndroid) {
      setPhase('removed')
      return
    }

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
        <img className="intro-mark" src="/seno-splash-logo.png" alt="SENO" />
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
