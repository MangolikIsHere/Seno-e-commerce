'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isSenoAndroidApp } from '@/lib/platform'

export function AndroidAppEnhancer() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isApp = isSenoAndroidApp()

    if (isApp) {
      document.documentElement.classList.add('seno-android-app')

      // Expose Next.js SPA router to Android Native Bottom Navigation for instantaneous, zero-reload transitions
      const globalObj = window as unknown as { __senoNavigate?: (path: string) => void }
      globalObj.__senoNavigate = (path: string) => {
        try {
          router.push(path)
        } catch {
          window.location.href = path
        }
      }
    } else {
      // Normal mobile web / desktop / PWA: ensure seno-android-app is NOT applied
      document.documentElement.classList.remove('seno-android-app')

      // Clean up legacy cookies or session storage that may have leaked from past tests
      try {
        if (document.cookie.includes('seno_platform=')) {
          document.cookie = 'seno_platform=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;'
        }
        sessionStorage.removeItem('seno_platform')
      } catch {
        // ignore
      }
    }

    return () => {
      delete (window as unknown as { __senoNavigate?: unknown }).__senoNavigate
    }
  }, [router])

  return null
}
