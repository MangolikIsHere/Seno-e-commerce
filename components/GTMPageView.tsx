'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer?: Record<string, any>[]
  }
}

/**
 * Tracks client-side page views in Google Tag Manager across Next.js App Router navigations.
 * Pushes standard page_view events to window.dataLayer on route transitions.
 */
export function GTMPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const query = searchParams?.toString()
    const url = query ? `${pathname}?${query}` : pathname

    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'page_view',
      page: url,
      page_path: pathname,
      page_location: window.location.href,
      page_title: typeof document !== 'undefined' ? document.title : '',
    })
  }, [pathname, searchParams])

  return null
}

