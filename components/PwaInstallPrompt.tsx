'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { X, Share, PlusSquare } from 'lucide-react'
import { isSenoAndroidApp } from '@/lib/platform'
import { useStore } from '@/context/StoreContext'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PwaInstallContextValue {
  isSupported: boolean
  isStandalone: boolean
  isIos: boolean
  popupOpen: boolean
  persistentButtonVisible: boolean
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'>
  dismissPopup: () => void
  showIosGuide: boolean
  closeIosGuide: () => void
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// SENO Brand Mark Component
// Uses the approved shopping-bag S logo
// ─────────────────────────────────────────────────────────────────────────────
export function SenoMarkIcon({ className = 'w-5 h-5', size = 20 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/icons/icon-192x192.png"
      alt="SENO"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PwaInstallProvider
// Manages global installation state, 5-10s storefront timing, dismissal persistence,
// and single source of truth for all PWA entry points.
// ─────────────────────────────────────────────────────────────────────────────
export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [isPopupDismissed, setIsPopupDismissed] = useState(false)
  const [timerElapsed, setTimerElapsed] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  // 1. Initial platform & standalone detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkStandalone = (): boolean => {
      if (isSenoAndroidApp()) return true
      try {
        if (localStorage.getItem('seno_pwa_installed') === 'true') return true
      } catch {
        // ignore storage restrictions
      }
      const matchMediaStandalone =
        window.matchMedia &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          window.matchMedia('(display-mode: fullscreen)').matches ||
          window.matchMedia('(display-mode: minimal-ui)').matches)
      if (matchMediaStandalone) return true

      const nav = window.navigator as unknown as { standalone?: boolean }
      if (nav && nav.standalone === true) return true

      if (document.documentElement.classList.contains('seno-android-app')) return true

      return false
    }

    const standalone = checkStandalone()
    setIsStandalone(standalone)
    if (standalone) {
      setIsSupported(false)
      return
    }

    // Read session-level dismissal state
    try {
      const dismissed = sessionStorage.getItem('seno_install_popup_dismissed') === 'true'
      setIsPopupDismissed(dismissed)
    } catch {
      // ignore
    }

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIos(ios)
    if (ios) {
      setIsSupported(true)
    }

    // Capture native beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsSupported(true)
    }

    // Successful installation event
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
      setIsSupported(false)
      try {
        localStorage.setItem('seno_pwa_installed', 'true')
      } catch {
        // ignore
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // 2. Timing: 5-10 seconds storefront delay (approximately 7 seconds)
  useEffect(() => {
    if (isStandalone) return

    // Show app-install promotion approximately 7 seconds after page entry
    const timer = setTimeout(() => {
      setTimerElapsed(true)
    }, 7000)

    return () => clearTimeout(timer)
  }, [isStandalone])

  // 3. User install trigger: identical function used across popup, persistent button, & footer
  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        try {
          localStorage.setItem('seno_pwa_installed', 'true')
        } catch {
          // ignore
        }
        setIsStandalone(true)
        setIsSupported(false)
        setDeferredPrompt(null)
      }
      return outcome
    }
    if (isIos) {
      setShowIosGuide(true)
      return 'ios'
    }
    return 'unavailable'
  }, [deferredPrompt, isIos])

  // 4. Popup dismissal handler
  const dismissPopup = useCallback(() => {
    try {
      sessionStorage.setItem('seno_install_popup_dismissed', 'true')
    } catch {
      // ignore
    }
    setIsPopupDismissed(true)
  }, [])

  const closeIosGuide = useCallback(() => {
    setShowIosGuide(false)
  }, [])

  // 5. Compute UI visibility states
  const popupOpen = !isStandalone && isSupported && timerElapsed && !isPopupDismissed
  // Persistent button is visible once popup is dismissed, provided the browser supports install
  const persistentButtonVisible = !isStandalone && isSupported && isPopupDismissed

  const contextValue = useMemo<PwaInstallContextValue>(
    () => ({
      isSupported,
      isStandalone,
      isIos,
      popupOpen,
      persistentButtonVisible,
      triggerInstall,
      dismissPopup,
      showIosGuide,
      closeIosGuide,
    }),
    [
      isSupported,
      isStandalone,
      isIos,
      popupOpen,
      persistentButtonVisible,
      triggerInstall,
      dismissPopup,
      showIosGuide,
      closeIosGuide,
    ]
  )

  return <PwaInstallContext.Provider value={contextValue}>{children}</PwaInstallContext.Provider>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePwaInstall
// Exposes the shared install state & actions
// ─────────────────────────────────────────────────────────────────────────────
export function usePwaInstall() {
  const context = useContext(PwaInstallContext)
  if (!context) {
    return {
      isSupported: false,
      isStandalone: false,
      isIos: false,
      popupOpen: false,
      persistentButtonVisible: false,
      triggerInstall: async (): Promise<'unavailable'> => 'unavailable',
      dismissPopup: () => {},
      showIosGuide: false,
      closeIosGuide: () => {},
    }
  }
  return context
}

// ─────────────────────────────────────────────────────────────────────────────
// SenoAppInstallExperience
// Renders the luxury popup, persistent floating button, and iOS modal guide.
// Intelligently suppresses during checkout, orders, admin, and active modals.
// ─────────────────────────────────────────────────────────────────────────────
export function SenoAppInstallExperience() {
  const {
    popupOpen,
    persistentButtonVisible,
    triggerInstall,
    dismissPopup,
    showIosGuide,
    closeIosGuide,
    isStandalone,
  } = usePwaInstall()

  const pathname = usePathname() || ''
  const store = useStore()
  const isModalActive = Boolean(store?.cartOpen || store?.searchOpen || store?.mobileMenuOpen)

  // Critical routes where promotions must never interfere with sensitive flows
  const isCriticalRoute =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller')

  // Completely unmount/render nothing if already installed or on critical routes
  if (isStandalone || isCriticalRoute || isModalActive) {
    return (
      <>
        {showIosGuide && <IosGuideModal onClose={closeIosGuide} />}
      </>
    )
  }

  return (
    <>
      {/* 1. Main Install Popup (Desktop: bottom-right card, Mobile: bottom-sheet above navigation) */}
      {popupOpen && (
        <aside
          className="seno-install-popup-card"
          role="dialog"
          aria-label="Install SENO App"
          aria-modal="false"
        >
          {/* Header Row */}
          <div className="seno-install-popup-header">
            <div className="seno-install-popup-mark">
              <div className="seno-popup-mark-badge">
                <SenoMarkIcon size={24} className="w-6 h-6 shrink-0" />
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPopup}
              className="seno-install-popup-close"
              aria-label="Dismiss app install promotion"
            >
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          {/* Typography */}
          <h3 className="seno-install-popup-title">Take SENO with you</h3>
          <p className="seno-install-popup-desc">Shop faster with the SENO App.</p>

          {/* Actions */}
          <div className="seno-install-popup-actions">
            <button
              type="button"
              onClick={triggerInstall}
              className="seno-install-popup-btn"
              id="seno-popup-install-action"
            >
              <span>Install App</span>
            </button>
            <button
              type="button"
              onClick={dismissPopup}
              className="seno-install-popup-dismiss"
            >
              Not now
            </button>
          </div>
        </aside>
      )}

      {/* 2. Persistent Install Button (Desktop: bottom-right, Mobile: floating above mobile bottom nav) */}
      {persistentButtonVisible && !popupOpen && (
        <button
          type="button"
          onClick={triggerInstall}
          className="seno-persistent-install-btn"
          aria-label="Install SENO App"
          id="seno-persistent-install-btn"
        >
          <div className="seno-persistent-mark-wrap">
            <SenoMarkIcon size={16} className="w-4 h-4 shrink-0 rounded-full" />
          </div>
          <span>Install App</span>
        </button>
      )}

      {/* 3. iOS Installation Guide Modal */}
      {showIosGuide && <IosGuideModal onClose={closeIosGuide} />}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// IosGuideModal
// Step-by-step instructions for iOS Safari users
// ─────────────────────────────────────────────────────────────────────────────
function IosGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-guide-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[var(--surface,#ffffff)] border border-[var(--border,#e2e1dc)] max-w-sm w-full p-6 shadow-2xl relative rounded-md">
        <button
          onClick={onClose}
          aria-label="Close guide"
          className="absolute top-4 right-4 text-[var(--muted,#676767)] hover:text-[var(--ink,#171717)] p-1 cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 shrink-0 bg-[var(--bg,#fbfbfa)] border border-[var(--border,#e2e1dc)] p-1 flex items-center justify-center rounded">
            <SenoMarkIcon size={30} className="w-7 h-7 shrink-0" />
          </div>
          <div>
            <h3 id="ios-guide-title" className="text-sm font-medium tracking-tight">
              Add SENO to Home Screen
            </h3>
            <p className="text-[11px] text-[var(--muted,#676767)]">Install on your iPhone or iPad</p>
          </div>
        </div>

        <ol className="space-y-3 text-xs text-[var(--ink,#171717)] mb-6">
          <li className="flex items-start gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--soft,#f1f1ef)] text-[10px] font-medium shrink-0 mt-0.5">
              1
            </span>
            <span>
              Tap the <strong className="font-semibold">Share</strong> button in Safari&apos;s bottom toolbar{' '}
              <Share size={13} className="inline ml-1 text-sky-600" />
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--soft,#f1f1ef)] text-[10px] font-medium shrink-0 mt-0.5">
              2
            </span>
            <span>
              Scroll down and tap <strong className="font-semibold">Add to Home Screen</strong>{' '}
              <PlusSquare size={13} className="inline ml-1" />
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--soft,#f1f1ef)] text-[10px] font-medium shrink-0 mt-0.5">
              3
            </span>
            <span>
              Tap <strong className="font-semibold">Add</strong> in the top right corner.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[var(--ink,#171717)] text-[var(--bg,#fbfbfa)] text-xs tracking-wider uppercase font-medium hover:opacity-90 transition-opacity cursor-pointer text-center"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FooterInstallButton
// Persistent low-profile entry point in the website footer.
// Kept for backward compatibility and full footer discoverability.
// ─────────────────────────────────────────────────────────────────────────────
export function FooterInstallButton() {
  const { isSupported, isStandalone, triggerInstall } = usePwaInstall()

  if (isStandalone || !isSupported) return null

  return (
    <li>
      <button
        type="button"
        onClick={() => triggerInstall()}
        className="footer-install-btn"
        aria-label="Install SENO app"
        id="footer-pwa-install-btn"
      >
        Install App
      </button>
    </li>
  )
}
