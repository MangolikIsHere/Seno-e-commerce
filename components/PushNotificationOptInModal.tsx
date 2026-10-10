'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Check, X, ShieldAlert, ArrowRight, Settings } from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { useStore } from '@/context/StoreContext'

const STORAGE_KEY_DISMISSED = 'seno_push_optin_dismissed'
const STORAGE_KEY_ENABLED = 'seno_push_optin_enabled'
const STORAGE_KEY_VIEWS = 'seno_product_views_count'

type PopupState = 'prompt' | 'subscribing' | 'success' | 'server_error' | 'denied_help'

export function PushNotificationOptInModal() {
  const pathname = usePathname() || ''
  const store = useStore()
  const { isPushSupported, pushEnabled, enablePushSubscription } = useNotifications()

  const [isVisible, setIsVisible] = useState(false)
  const [popupState, setPopupState] = useState<PopupState>('prompt')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [timerReady, setTimerReady] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Check if suppressed by route or active UI
  const isSuppressedRoute =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller')

  const isStoreDrawerOpen = Boolean(store?.cartOpen || store?.searchOpen || store?.mobileMenuOpen)

  // 2. Track product views for meaningful interaction trigger
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (pathname.startsWith('/product/') || pathname.startsWith('/products/')) {
      try {
        const count = parseInt(sessionStorage.getItem(STORAGE_KEY_VIEWS) || '0', 10) + 1
        sessionStorage.setItem(STORAGE_KEY_VIEWS, count.toString())
      } catch {
        // ignore storage restrictions
      }
    }
  }, [pathname])

  // 3. Sensible display timer: 9-11 seconds of active browsing or meaningful product exploration
  useEffect(() => {
    if (typeof window === 'undefined' || !isPushSupported) return

    // Never trigger if already granted or previously dismissed/enabled
    try {
      if (sessionStorage.getItem(STORAGE_KEY_DISMISSED) === 'true') return
      if (localStorage.getItem(STORAGE_KEY_ENABLED) === 'true') return
    } catch {
      // ignore
    }

    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return
      }
    }

    // Meaningful interaction check: multiple product views reduces wait to 4 seconds
    let productViews = 0
    try {
      productViews = parseInt(sessionStorage.getItem(STORAGE_KEY_VIEWS) || '0', 10)
    } catch {
      // ignore
    }

    const delayMs = productViews >= 2 ? 4000 : 9500

    timerRef.current = setTimeout(() => {
      setTimerReady(true)
    }, delayMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isPushSupported])

  // 4. Evaluate visibility condition
  useEffect(() => {
    if (!timerReady || isSuppressedRoute || isStoreDrawerOpen || pushEnabled) {
      setIsVisible(false)
      return
    }

    // Never show if Razorpay payment frame or container is active
    if (typeof document !== 'undefined') {
      const razorpayActive =
        document.querySelector('.razorpay-container') ||
        document.querySelector('iframe[name^="razorpay"]') ||
        document.querySelector('.razorpay-backdrop')
      if (razorpayActive) {
        setIsVisible(false)
        return
      }

      // Check if PWA install popup is active on screen to prevent modal collision
      const pwaPopupActive = document.querySelector('.seno-install-popup-card')
      if (pwaPopupActive) {
        setIsVisible(false)
        return
      }
    }

    try {
      if (sessionStorage.getItem(STORAGE_KEY_DISMISSED) === 'true') {
        setIsVisible(false)
        return
      }
      if (localStorage.getItem(STORAGE_KEY_ENABLED) === 'true') {
        setIsVisible(false)
        return
      }
    } catch {
      // ignore
    }

    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        setIsVisible(false)
        return
      }
    }

    setIsVisible(true)
  }, [timerReady, isSuppressedRoute, isStoreDrawerOpen, pushEnabled])

  // 5. Dismissal ("Maybe later") handler
  const handleDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY_DISMISSED, 'true')
    } catch {
      // ignore
    }
    setIsVisible(false)
  }, [])

  // 6. Explicit "Enable Notifications" click handler
  const handleEnableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined' || !isPushSupported) {
      setErrorMessage('Push notifications are not supported in this browser.')
      setPopupState('server_error')
      return
    }

    setPopupState('subscribing')

    try {
      const result = await enablePushSubscription()

      if (result.permission === 'denied') {
        setPopupState('denied_help')
        return
      }

      if (result.permission === 'default') {
        // Customer dismissed browser dialog without granting or denying
        setPopupState('prompt')
        return
      }

      // Browser permission granted
      if (result.browserSubscribed) {
        // Check if server-side registration failed
        if (result.error && !result.serverRegistered) {
          setErrorMessage(result.error)
          setPopupState('server_error')
          return
        }

        // Successfully registered!
        try {
          localStorage.setItem(STORAGE_KEY_ENABLED, 'true')
        } catch {
          // ignore
        }

        setPopupState('success')

        // Gracefully close popup after 2.5 seconds
        setTimeout(() => {
          setIsVisible(false)
        }, 2500)
      } else {
        setErrorMessage(result.error || 'Could not initialize push subscription.')
        setPopupState('server_error')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
      setPopupState('server_error')
    }
  }, [enablePushSubscription, isPushSupported])

  // 7. Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleDismiss()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, handleDismiss])

  if (!isVisible) {
    return null
  }

  return (
    <aside
      className="seno-push-optin-card"
      role="dialog"
      aria-modal="false"
      aria-labelledby="seno-push-optin-title"
      aria-describedby="seno-push-optin-desc"
      aria-live="polite"
    >
      {/* ─────────────────────────────────────────────────────────────
          STATE 1: DEFAULT OPT-IN PROMPT
      ───────────────────────────────────────────────────────────── */}
      {popupState === 'prompt' && (
        <div className="seno-push-prompt-content">
          <div className="seno-push-prompt-header">
            <div className="seno-push-bell-badge" aria-hidden="true">
              <Bell size={17} strokeWidth={1.75} />
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="seno-push-close-btn"
              aria-label="Maybe later"
              title="Close"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="seno-push-text-block">
            <span className="seno-push-kicker">STAY IN THE LOOP</span>
            <h3 id="seno-push-optin-title" className="seno-push-title">
              Never miss a SENO update.
            </h3>
            <p id="seno-push-optin-desc" className="seno-push-desc">
              Enable notifications to receive timely updates about your orders, deliveries, payments, and refunds.
            </p>
          </div>

          <div className="seno-push-actions">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="seno-push-btn-primary"
              id="seno-enable-push-btn"
            >
              Enable Notifications
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="seno-push-btn-secondary"
            >
              Maybe later
            </button>
          </div>

          <p className="seno-push-supporting">
            Only important SENO updates. You can manage notification permissions in your browser settings.
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE 2: SUBSCRIBING / PROCESSING
      ───────────────────────────────────────────────────────────── */}
      {popupState === 'subscribing' && (
        <div className="seno-push-loading-content">
          <div className="seno-push-spinner-badge">
            <span className="seno-push-spinner" />
          </div>
          <div className="seno-push-text-block">
            <h4 className="seno-push-title-sm">Connecting to SENO Updates...</h4>
            <p className="seno-push-desc-sm">
              Please grant permission in the browser prompt to activate instant order alerts.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE 3: CONFIRMED SUCCESS
      ───────────────────────────────────────────────────────────── */}
      {popupState === 'success' && (
        <div className="seno-push-success-content">
          <div className="seno-push-success-badge" aria-hidden="true">
            <Check size={18} strokeWidth={2.2} />
          </div>
          <div className="seno-push-text-block">
            <h3 id="seno-push-optin-title" className="seno-push-title">
              Notifications enabled
            </h3>
            <p id="seno-push-optin-desc" className="seno-push-desc">
              You&apos;ll receive supported SENO updates here.
            </p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE 4: SERVER REGISTRATION ERROR (SAFE RETRY)
      ───────────────────────────────────────────────────────────── */}
      {popupState === 'server_error' && (
        <div className="seno-push-error-content">
          <div className="seno-push-prompt-header">
            <div className="seno-push-error-badge" aria-hidden="true">
              <ShieldAlert size={17} strokeWidth={1.8} />
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="seno-push-close-btn"
              aria-label="Dismiss"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="seno-push-text-block">
            <span className="seno-push-kicker text-amber-800">SETUP INCOMPLETE</span>
            <h3 id="seno-push-optin-title" className="seno-push-title">
              Connection issue
            </h3>
            <p id="seno-push-optin-desc" className="seno-push-desc">
              Browser permission was granted, but server registration could not be completed ({errorMessage || 'network error'}).
            </p>
          </div>

          <div className="seno-push-actions">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="seno-push-btn-primary"
            >
              Retry Registration
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="seno-push-btn-secondary"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STATE 5: PERMISSION DENIED IN BROWSER SETTINGS
      ───────────────────────────────────────────────────────────── */}
      {popupState === 'denied_help' && (
        <div className="seno-push-denied-content">
          <div className="seno-push-prompt-header">
            <div className="seno-push-bell-badge" aria-hidden="true">
              <Settings size={17} strokeWidth={1.75} />
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="seno-push-close-btn"
              aria-label="Dismiss"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          <div className="seno-push-text-block">
            <span className="seno-push-kicker">BROWSER SETTINGS</span>
            <h3 id="seno-push-optin-title" className="seno-push-title">
              Notifications are blocked
            </h3>
            <p id="seno-push-optin-desc" className="seno-push-desc">
              To receive instant updates on your orders and deliveries, please allow notifications for SENO in your browser settings:
            </p>
          </div>

          <ol className="seno-push-help-steps">
            <li>Click the icon or lock beside <strong>seno.co.in</strong> in your address bar.</li>
            <li>Select <strong>Site settings</strong> or <strong>Permissions</strong>.</li>
            <li>Change <strong>Notifications</strong> to <strong>Allow</strong>.</li>
          </ol>

          <div className="seno-push-actions">
            <button
              type="button"
              onClick={handleDismiss}
              className="seno-push-btn-primary"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
