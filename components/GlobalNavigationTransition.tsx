'use client'

import React, { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function GlobalNavigationTransition() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isPopstateRef = useRef(false)
  const pendingHashRef = useRef<string | null>(null)
  const prevPathnameRef = useRef(pathname)
  const prevSearchRef = useRef(searchParams?.toString() || '')

  // Flag browser back/forward so the browser can restore its scroll position.
  useEffect(() => {
    const handlePopstate = () => {
      isPopstateRef.current = true
    }

    window.addEventListener('popstate', handlePopstate)
    return () => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [])

  // Preserve scroll behavior without placing an overlay over the active page.
  useEffect(() => {
    const currentSearch = searchParams?.toString() || ''
    const routeChanged = pathname !== prevPathnameRef.current || currentSearch !== prevSearchRef.current

    prevPathnameRef.current = pathname
    prevSearchRef.current = currentSearch

    if (!routeChanged) return

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

  return null
}
