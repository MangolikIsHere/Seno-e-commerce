'use client'

import React, { useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function GlobalNavigationTransition() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [transitionState, setTransitionState] = useState<'idle' | 'covering' | 'revealing'>('idle')

  const isPopstateRef = useRef(false)
  const pendingHashRef = useRef<string | null>(null)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPathnameRef = useRef(pathname)
  const prevSearchRef = useRef(searchParams?.toString() || '')

  // 1. Popstate listener: flag browser back/forward and dismiss any active overlay
  useEffect(() => {
    const handlePopstate = () => {
      isPopstateRef.current = true
      setTransitionState('idle')
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }

    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [])

  // 2. Global capture-phase click listener for internal navigation links
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Must not trigger for elements marked with [data-no-navigation] (e.g. Quick Add, Wishlist)
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('[data-no-navigation]')) {
        return
      }

      // Only standard left click without modifier keys
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      // If event was prevented by something else, do not navigate
      if (event.defaultPrevented) {
        return
      }

      const anchor = target.closest('a')
      if (!anchor) return

      // Exclude special anchor targets or non-standard protocols
      const targetAttr = anchor.getAttribute('target')
      if (targetAttr && targetAttr !== '_self') return

      const rawHref = anchor.getAttribute('href')
      if (!rawHref) return
      if (
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:') ||
        anchor.hasAttribute('download')
      ) {
        return
      }

      try {
        const destUrl = new URL(anchor.href, window.location.href)
        const currentUrl = new URL(window.location.href)

        // Must be same origin
        if (destUrl.origin !== currentUrl.origin) return

        // Pure in-page anchor jump (e.g. href="#new-arrivals" on the current page)
        if (
          destUrl.pathname === currentUrl.pathname &&
          destUrl.search === currentUrl.search &&
          destUrl.hash
        ) {
          // In-page hash jump: do not trigger full S transition overlay
          return
        }

        // Exactly the same page without hash
        if (
          destUrl.pathname === currentUrl.pathname &&
          destUrl.search === currentUrl.search &&
          !destUrl.hash
        ) {
          return
        }

        // Valid internal page navigation
        isPopstateRef.current = false
        pendingHashRef.current = destUrl.hash ? destUrl.hash.slice(1) : null

        if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
        setTransitionState('covering')

        // Safety fallback: dismiss overlay if navigation cancels or hangs
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
        safetyTimerRef.current = setTimeout(() => {
          setTransitionState('idle')
        }, 2000)
      } catch {
        // Ignore URL parsing errors
      }
    }

    document.addEventListener('click', handleGlobalClick, true)
    return () => {
      document.removeEventListener('click', handleGlobalClick, true)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [])

  // 3. Route change effect: handle scroll restoration and frame-committed overlay dismissal
  useEffect(() => {
    const currentSearch = searchParams?.toString() || ''
    const routeChanged = pathname !== prevPathnameRef.current || currentSearch !== prevSearchRef.current

    prevPathnameRef.current = pathname
    prevSearchRef.current = currentSearch

    if (!routeChanged) return

    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)

    if (isPopstateRef.current) {
      // Browser Back/Forward navigation: DO NOT force scrollTo(0,0), let browser restore naturally
      isPopstateRef.current = false
      setTransitionState('idle')
      pendingHashRef.current = null
      return
    }

    // Normal internal navigation:
    // If target has a hash (e.g. /#new-arrivals), do not force scrollTo(0,0) — allow hash scroll
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

    // Frame-committed dismissal: ensure DOM renders the new route at the correct scroll position
    // before initiating the smooth opacity reveal
    requestAnimationFrame(() => {
      if (!hasHash && (window.scrollY !== 0 || document.documentElement.scrollTop !== 0)) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
        if (document.documentElement) document.documentElement.scrollTop = 0
        if (document.body) document.body.scrollTop = 0
      }
      requestAnimationFrame(() => {
        // Transition to revealing state (triggers 200ms opacity fade out in CSS)
        setTransitionState('revealing')

        // Once the 200ms fade completes, unmount the overlay
        revealTimerRef.current = setTimeout(() => {
          setTransitionState('idle')
        }, 220)
      })
    })
  }, [pathname, searchParams])

  if (transitionState === 'idle') return null

  return (
    <div
      className={`seno-nav-loader-container ${transitionState === 'revealing' ? 'revealing' : ''}`}
      aria-label="Loading..."
      role="status"
    >
      <div className="seno-nav-loader-s">S</div>
    </div>
  )
}
