'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    // 1. If in development, unregister any existing service worker and purge caches
    // to guarantee 'npm run dev' is never affected by stale cached assets.
    if (process.env.NODE_ENV !== 'production') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister()
          }
        })
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            if (name.startsWith('seno-')) {
              caches.delete(name)
            }
          }
        })
      }
      return
    }

    // 2. Production Service Worker Registration
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        // Listen for new service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new service worker is installed.
              // CRITICAL: NEVER force a reload if the customer is on an active checkout page!
              const isCheckout = window.location.pathname.startsWith('/checkout')
              if (!isCheckout) {
                // Inform new worker to take control
                newWorker.postMessage({ type: 'SKIP_WAITING' })
              }
            }
          })
        })

        // Check for updates periodically (every 60 minutes)
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 60 * 1000)
      } catch (err) {
        // Silently fail if SW registration is blocked by environment
        console.debug('Service Worker registration skipped:', err)
      }
    }

    // Register after page load to avoid competing for critical resources
    if (document.readyState === 'complete') {
      registerSW()
    } else {
      window.addEventListener('load', registerSW)
      return () => window.removeEventListener('load', registerSW)
    }
  }, [])

  return null
}
