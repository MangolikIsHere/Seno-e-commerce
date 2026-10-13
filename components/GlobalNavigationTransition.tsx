'use client'

import React, { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function GlobalNavigationTransition() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)

  const isPopstateRef = useRef(false)
  const pendingHashRef = useRef<string | null>(null)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPathnameRef = useRef(pathname)
  const prevSearchRef = useRef(searchParams?.toString() || '')

  const clearNavigationFeedback = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current)
      fallbackTimerRef.current = null
    }
    setIsNavigating(false)
  }

  // Show feedback without taking ownership of the link or delaying the browser.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (
        !anchor ||
        event.button !== 0 ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.hasAttribute('download') ||
        anchor.closest('[data-no-navigation]') ||
        (anchor.target && anchor.target !== '_self')
      ) {
        return
      }

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) return

      try {
        const destination = new URL(anchor.href, window.location.href)
        const current = new URL(window.location.href)
        if (
          destination.origin !== current.origin ||
          (destination.pathname === current.pathname &&
            destination.search === current.search &&
            destination.hash === current.hash)
        ) {
          return
        }

        if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
        setIsNavigating(true)
        // This only clears feedback if the browser keeps the current document
        // after a cancelled/failed client navigation; it never delays navigation.
        fallbackTimerRef.current = setTimeout(clearNavigationFeedback, 1500)
      } catch {
        // Invalid URLs are left to the browser's normal handling.
      }
    }

    const handlePopstate = () => {
      isPopstateRef.current = true
      clearNavigationFeedback()
    }

    document.addEventListener('click', handleClick, true)
    window.addEventListener('popstate', handlePopstate)
    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('popstate', handlePopstate)
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [])

  // Preserve scroll behavior without placing an overlay over the active page.
  useEffect(() => {
    const currentSearch = searchParams?.toString() || ''
    const routeChanged = pathname !== prevPathnameRef.current || currentSearch !== prevSearchRef.current

    prevPathnameRef.current = pathname
    prevSearchRef.current = currentSearch

    if (!routeChanged) return

    clearNavigationFeedback()

    if (isPopstateRef.current) {
      // Browser Back/Forward navigation: let the browser restore naturally.
      isPopstateRef.current = false
      pendingHashRef.current = null
      return
    }

    const targetHash = window.location.hash ? window.location.hash.slice(1) : pendingHashRef.current
    const hasHash = Boolean(targetHash)

    if (!hasHash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      if (document.documentElement) document.documentElement.scrollTop = 0
      if (document.body) document.body.scrollTop = 0
    } else {
      // Target has a hash section: ensure target element is scrolled into view once mounted
      requestAnimationFrame(() => {
        const targetEl = document.getElementById(targetHash!)
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'instant', block: 'start' })
        }
      })
    }

    pendingHashRef.current = null
  }, [pathname, searchParams])

  if (!isNavigating) return null

  return (
    <div className="seno-nav-loader-container" aria-label="Loading page" role="status">
      <div className="seno-nav-loader-backdrop" aria-hidden="true" />
      <div className="seno-nav-loader-medallion" aria-hidden="true">
        <svg
          className="seno-nav-loader-halo"
          viewBox="0 0 88 88"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="senoNavHaloGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C5A059" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#171717" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#171717" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* Subtle outer static guide track */}
          <circle
            cx="44"
            cy="44"
            r="39"
            stroke="rgba(23, 23, 23, 0.08)"
            strokeWidth="1"
          />
          {/* Delicate inner dashed horology ring */}
          <circle
            cx="44"
            cy="44"
            r="34"
            stroke="rgba(197, 160, 89, 0.22)"
            strokeWidth="0.75"
            strokeDasharray="2 3.5"
          />
          {/* Rotating luxury accent arc */}
          <circle
            className="seno-nav-loader-arc"
            cx="44"
            cy="44"
            r="39"
            stroke="url(#senoNavHaloGrad)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="54 191"
          />
        </svg>

        <div className="seno-nav-loader-content">
          <span className="seno-nav-loader-s">S</span>
          <span className="seno-nav-loader-brand">SENO</span>
        </div>
      </div>
    </div>
  )
}
