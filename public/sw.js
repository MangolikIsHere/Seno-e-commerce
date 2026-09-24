/**
 * SENO Production-Safe Service Worker
 * 
 * Strict E-Commerce Caching Policy:
 * - CACHE: Immutable Next.js static bundles (/_next/static/*), static brand icons, and /offline fallback.
 * - NETWORK ONLY (NEVER CACHE):
 *     - All non-GET requests (POST, PUT, DELETE, PATCH)
 *     - All cross-origin requests (Supabase, Razorpay, analytics, CDN)
 *     - Internal API routes (/api/*)
 *     - Dynamic/private e-commerce routes (/cart, /checkout, /account, /seller, /admin)
 *     - Dynamic product images and Supabase storage uploads
 * - NAVIGATION: Network-first. If completely offline, fallback to the branded /offline page.
 */

const CACHE_VERSION = 'seno-v1-static'
const OFFLINE_URL = '/offline'

// Pre-cached shell & brand assets needed for the offline state
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/brand/seno-mark-512.png',
  '/favicon.ico',
]

// Patterns that MUST NEVER be cached
const NEVER_CACHE_PATTERNS = [
  /^\/api\//i,
  /^\/account/i,
  /^\/seller/i,
  /^\/admin/i,
  /^\/checkout/i,
  /^\/cart/i,
  /^\/uploads\//i,
  /^\/_next\/image/i, // Dynamic image optimization endpoint
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    }).then(() => {
      // Allow new service worker to wait until client signals or until next load
      return self.skipWaiting()
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('seno-') && cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // 1. NEVER handle or cache non-GET requests
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  // 2. NEVER handle or cache cross-origin requests (Supabase, Razorpay, Google Fonts, etc.)
  if (url.origin !== self.location.origin) {
    return
  }

  // 3. NEVER handle or cache sensitive, dynamic, or e-commerce transaction paths
  const isExcludedPath = NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))
  if (isExcludedPath) {
    return
  }

  // 4. Page Navigations: Strict Network-First with Offline Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Live HTML is returned directly.
          // We DO NOT cache HTML documents to guarantee prices, inventory, and user sessions remain strictly server-authoritative.
          return response
        })
        .catch(async () => {
          // Network failed (offline)
          const cache = await caches.open(CACHE_VERSION)
          const cachedOffline = await cache.match(OFFLINE_URL)
          if (cachedOffline) {
            return cachedOffline
          }
          return new Response('You are offline. Please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          })
        })
    )
    return
  }

  // 5. Next.js Immutable Static Chunks & CSS (/_next/static/*)
  // These files are content-hashed by Next.js and safe to cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return networkResponse
        })
      })
    )
    return
  }

  // 6. Static Brand Icons and Public UI Assets (/brand/*, /icons/*, /favicon.ico)
  if (url.pathname.startsWith('/brand/') || url.pathname.startsWith('/icons/') || url.pathname === '/favicon.ico') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return networkResponse
        }).catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // Any other requests pass through untouched to the network
})

// Listen for messages from clients (e.g. skipWaiting trigger from update prompt)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// =========================================================================
// PWA WEB PUSH & NOTIFICATION CLICK HANDLERS
// =========================================================================
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload = {
    title: 'SENO Update',
    body: 'You have a new notification from SENO.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: '/account' }
  }

  try {
    const data = event.data.json()
    payload = {
      title: data.title || payload.title,
      body: data.body || payload.body,
      icon: data.icon || payload.icon,
      badge: data.badge || payload.badge,
      data: data.data || { url: data.url || '/account' }
    }
  } catch (err) {
    payload.body = event.data.text()
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      vibrate: [100, 50, 100],
      tag: 'seno-notification'
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/account'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open on this origin, focus it and navigate
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})
