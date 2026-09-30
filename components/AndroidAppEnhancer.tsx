'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AndroidAppEnhancer() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Expose Next.js SPA router to Android Native Bottom Navigation for instantaneous, zero-reload transitions
    const globalObj = window as unknown as { __senoNavigate?: (path: string) => void }
    globalObj.__senoNavigate = (path: string) => {
      try {
        router.push(path)
      } catch {
        window.location.href = path
      }
    }

    const checkIsAndroidApp = (): boolean => {
      // 1. Injected JS Bridge
      if ((window as unknown as { SenoNativeApp?: unknown }).SenoNativeApp !== undefined) {
        return true
      }
      // 2. User Agent custom token
      if (window.navigator.userAgent.includes('SenoAndroidApp')) {
        return true
      }
      // 3. Cookie check
      if (document.cookie.includes('seno_platform=android')) {
        return true
      }
      // 4. Query param check
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('platform') === 'android') {
        return true
      }
      // 5. Session storage persisted state
      try {
        if (sessionStorage.getItem('seno_platform') === 'android') {
          return true
        }
      } catch {
        // ignore
      }
      return false
    }

    if (checkIsAndroidApp()) {
      document.documentElement.classList.add('seno-android-app')
      try {
        sessionStorage.setItem('seno_platform', 'android')
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
