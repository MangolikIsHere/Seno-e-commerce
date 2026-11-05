'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { X, Share, PlusSquare, Download, Sparkles, Check, Monitor, Smartphone, ArrowRight } from 'lucide-react'
import { isSenoAndroidApp } from '@/lib/platform'
import { useStore } from '@/context/StoreContext'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'ios' | 'manual' | 'unavailable'

interface PwaInstallContextValue {
  isSupported: boolean
  isStandalone: boolean
  isIos: boolean
  isAndroid: boolean
  canInstall: boolean
  popupOpen: boolean
  triggerInstall: () => Promise<InstallOutcome>
  dismissPopup: () => void
  showIosGuide: boolean
  closeIosGuide: () => void
  showDesktopGuide: boolean
  closeDesktopGuide: () => void
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// SENO Brand Mark Component
// Uses the official SENO brand emblem
// ─────────────────────────────────────────────────────────────────────────────
export function SenoMarkIcon({ className = 'w-5 h-5', size = 20 }: { className?: string; size?: number }) {
  return (
    <Image
      src="/icons/icon-192x192.png"
      alt="SENO App Icon"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PwaInstallProvider
// Robust installation state machine, 5-10s storefront timing, 7-day cooldown,
// and single authoritative source of truth.
// ─────────────────────────────────────────────────────────────────────────────
const COOLDOWN_DAYS = 7
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000
const POPUP_DELAY_MS = 6000 // 6 seconds after page load

function checkIsStandaloneNow(): boolean {
  if (typeof window === 'undefined') return false
  if (isSenoAndroidApp()) return true
  if (document.documentElement.classList.contains('seno-android-app')) return true
  if (document.documentElement.classList.contains('seno-app-standalone')) return true

  const nav = window.navigator as unknown as { standalone?: boolean }
  if (nav && nav.standalone === true) return true

  if (window.matchMedia) {
    if (window.matchMedia('(display-mode: standalone)').matches) return true
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  }

  return false
}

export function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState<boolean>(() => checkIsStandaloneNow())
  const [isIos, setIsIos] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isPopupDismissed, setIsPopupDismissed] = useState(true) // start dismissed until checks complete
  const [timerElapsed, setTimerElapsed] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [showDesktopGuide, setShowDesktopGuide] = useState(false)

  // 1. Initial platform & standalone detection
  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentStandalone = checkIsStandaloneNow()
    setIsStandalone(currentStandalone)
    if (currentStandalone) {
      document.documentElement.classList.add('seno-app-standalone')
    }

    // Listen for live display-mode changes
    if (window.matchMedia) {
      const mql = window.matchMedia('(display-mode: standalone)')
      const handleModeChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          setIsStandalone(true)
          document.documentElement.classList.add('seno-app-standalone')
        }
      }
      mql.addEventListener?.('change', handleModeChange)
    }

    // Platform detection
    const ua = window.navigator.userAgent.toLowerCase()
    const iosDetected = /iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    const androidDetected = /android/.test(ua)
    setIsIos(iosDetected)
    setIsAndroid(androidDetected)

    // 2. Cooldown and dismissal evaluation
    if (!currentStandalone) {
      try {
        const sessionDismissed = sessionStorage.getItem('seno_install_popup_session_dismissed') === 'true'
        const cooldownUntilStr = localStorage.getItem('seno_install_popup_cooldown_until')
        const cooldownUntil = cooldownUntilStr ? parseInt(cooldownUntilStr, 10) : 0
        const isCooldownActive = Date.now() < cooldownUntil

        if (sessionDismissed || isCooldownActive) {
          setIsPopupDismissed(true)
        } else {
          setIsPopupDismissed(false)
        }
      } catch {
        setIsPopupDismissed(false)
      }
    }

    // 3. Capture native beforeinstallprompt (Chromium / Android Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // 4. Authoritative installation confirmation (appinstalled event)
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
      document.documentElement.classList.add('seno-app-standalone')
      try {
        localStorage.setItem('seno_pwa_installed_confirmed', 'true')
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

  // 5. 5-10 Second Timer Delay for First Installation Popup
  useEffect(() => {
    if (isStandalone) return

    const timer = setTimeout(() => {
      setTimerElapsed(true)
    }, POPUP_DELAY_MS)

    return () => clearTimeout(timer)
  }, [isStandalone])

  // 6. User install trigger: single unified action for header, popup, and footer
  const triggerInstall = useCallback(async (): Promise<InstallOutcome> => {
    // Dynamic platform check to ensure zero closure lag
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : ''
    const isIosDevice = isIos || (/iphone|ipad|ipod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream)

    // A. Native prompt available (Android Chrome, Chromium desktop, Edge)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
          setDeferredPrompt(null)
          setIsStandalone(true)
          document.documentElement.classList.add('seno-app-standalone')
          try {
            localStorage.setItem('seno_pwa_installed_confirmed', 'true')
          } catch {
            // ignore
          }
        }
        return outcome
      } catch (err) {
        console.warn('[PWA] Error launching native install prompt:', err)
      }
    }

    // B. iOS Safari / WebKit guide
    if (isIosDevice) {
      setShowIosGuide(true)
      return 'ios'
    }

    // C. Desktop or non-prompt browser guide
    setShowDesktopGuide(true)
    return 'manual'
  }, [deferredPrompt, isIos])

  // 7. Popup dismissal with 7-day cooldown and session suppression
  const dismissPopup = useCallback(() => {
    try {
      sessionStorage.setItem('seno_install_popup_session_dismissed', 'true')
      localStorage.setItem('seno_install_popup_cooldown_until', (Date.now() + COOLDOWN_MS).toString())
    } catch {
      // ignore
    }
    setIsPopupDismissed(true)
  }, [])

  const closeIosGuide = useCallback(() => {
    setShowIosGuide(false)
  }, [])

  const closeDesktopGuide = useCallback(() => {
    setShowDesktopGuide(false)
  }, [])

  // 8. Computed installation availability
  const canInstall = !isStandalone
  const popupOpen = !isStandalone && timerElapsed && !isPopupDismissed

  const contextValue = useMemo<PwaInstallContextValue>(
    () => ({
      isSupported: canInstall,
      isStandalone,
      isIos,
      isAndroid,
      canInstall,
      popupOpen,
      triggerInstall,
      dismissPopup,
      showIosGuide,
      closeIosGuide,
      showDesktopGuide,
      closeDesktopGuide,
    }),
    [
      canInstall,
      isStandalone,
      isIos,
      isAndroid,
      popupOpen,
      triggerInstall,
      dismissPopup,
      showIosGuide,
      closeIosGuide,
      showDesktopGuide,
      closeDesktopGuide,
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
      isAndroid: false,
      canInstall: false,
      popupOpen: false,
      triggerInstall: async (): Promise<InstallOutcome> => 'unavailable',
      dismissPopup: () => {},
      showIosGuide: false,
      closeIosGuide: () => {},
      showDesktopGuide: false,
      closeDesktopGuide: () => {},
    }
  }
  return context
}

// ─────────────────────────────────────────────────────────────────────────────
// HeaderInstallButton
// Persistent install button integrated directly in the website header.
// Styled with a tasteful gold accent and responsive for desktop & mobile.
// Disappears automatically once the app is installed / running standalone.
// ─────────────────────────────────────────────────────────────────────────────
export function HeaderInstallButton({ isMobile = false }: { isMobile?: boolean }) {
  const { canInstall, isStandalone, triggerInstall } = usePwaInstall()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isStandalone || !canInstall) return null

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={() => triggerInstall()}
        className="mobile-icon-btn header-nav-install"
        data-header-nav="install"
        aria-label="Install SENO App"
        title="Install SENO App"
      >
        <span className="install-icon-gold-badge">
          <Download size={17} strokeWidth={2.2} />
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => triggerInstall()}
      className="header-action-btn header-action-install-btn"
      aria-label="Install SENO App"
      title="Install SENO App on your device"
    >
      <span className="install-icon-gold-badge">
        <Download size={15} strokeWidth={2.2} />
      </span>
      <span className="header-install-text">INSTALL</span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HeaderDrawerInstallLink
// Drawer entry point for mobile slideout navigation
// ─────────────────────────────────────────────────────────────────────────────
export function HeaderDrawerInstallLink({ onClose }: { onClose?: () => void }) {
  const { canInstall, isStandalone, triggerInstall } = usePwaInstall()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isStandalone || !canInstall) return null

  return (
    <button
      type="button"
      onClick={() => {
        onClose?.()
        triggerInstall()
      }}
      className="mobile-drawer-link mobile-drawer-install-link"
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'linear-gradient(135deg, #171717 0%, #262422 100%)',
        color: '#fbfbfa',
        border: '1px solid #c5a47e',
        borderRadius: '3px',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(197, 164, 126, 0.2)',
            border: '1px solid #c5a47e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#c5a47e',
          }}
        >
          <Download size={14} strokeWidth={2.2} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.8px', color: '#fbfbfa' }}>
            INSTALL SENO APP
          </span>
          <span style={{ fontSize: '10px', color: '#c5a47e', marginTop: '1px' }}>
            Fast access &amp; luxury shopping
          </span>
        </div>
      </div>
      <ArrowRight size={14} style={{ color: '#c5a47e' }} />
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SenoAppInstallExperience
// Renders the luxury popup, iOS modal guide, and Desktop modal guide.
// Intelligently suppresses during checkout, auth, orders, admin, and active modals.
// ─────────────────────────────────────────────────────────────────────────────
export function SenoAppInstallExperience() {
  const {
    popupOpen,
    triggerInstall,
    dismissPopup,
    showIosGuide,
    closeIosGuide,
    showDesktopGuide,
    closeDesktopGuide,
    isStandalone,
  } = usePwaInstall()

  const pathname = usePathname() || ''
  const store = useStore()
  const isModalActive = Boolean(store?.cartOpen || store?.searchOpen || store?.mobileMenuOpen)

  // Critical routes where promotions must never interfere with sensitive flows
  const isCriticalRoute =
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/seller')

  return (
    <>
      {/* 1. First Installation Popup: Luxury SENO Card (Desktop: bottom-right, Mobile: floating bottom-sheet) */}
      {!isStandalone && !isCriticalRoute && !isModalActive && popupOpen && (
        <aside
          className="seno-luxury-install-card"
          role="dialog"
          aria-label="Install SENO App"
          aria-modal="false"
        >
          {/* Gold Hairline Top Accent */}
          <div className="seno-card-gold-bar" />

          {/* Header & Close */}
          <div className="seno-card-header">
            <div className="seno-card-brand-row">
              <div className="seno-card-emblem-wrap">
                <SenoMarkIcon size={28} className="w-7 h-7 shrink-0" />
              </div>
              <div className="seno-card-brand-meta">
                <span className="seno-card-eyebrow">SENO EXCLUSIVE</span>
                <span className="seno-card-store-name">SENO Mobile App</span>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPopup}
              className="seno-card-close-btn"
              aria-label="Dismiss app installation"
            >
              <X size={17} strokeWidth={2} />
            </button>
          </div>

          {/* Luxury Typography */}
          <div className="seno-card-body">
            <h3 className="seno-card-headline">Your Style. One Tap Away.</h3>
            <p className="seno-card-desc">
              Discover your favourite styles with the SENO shopping experience. Shop effortlessly, explore new arrivals and stay connected with everything you love.
            </p>

            {/* Value Props / Benefits */}
            <ul className="seno-card-benefits">
              <li>
                <span className="benefit-gold-dot">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Faster access to SENO</span>
              </li>
              <li>
                <span className="benefit-gold-dot">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>App-like shopping experience</span>
              </li>
              <li>
                <span className="benefit-gold-dot">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span>Easy access from your home screen</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="seno-card-actions">
            <button
              type="button"
              onClick={triggerInstall}
              className="seno-card-primary-btn"
              id="seno-popup-install-cta"
            >
              <Download size={14} strokeWidth={2.4} />
              <span>INSTALL SENO APP</span>
            </button>
            <button
              type="button"
              onClick={dismissPopup}
              className="seno-card-secondary-btn"
            >
              Maybe Later
            </button>
          </div>
        </aside>
      )}

      {/* 2. Platform Guides (Never blocked by modal active states so users can always see instructions) */}
      {showIosGuide && <IosGuideModal onClose={closeIosGuide} />}
      {showDesktopGuide && <DesktopGuideModal onClose={closeDesktopGuide} />}
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#171717] border border-[#c5a47e] max-w-sm w-full p-6 shadow-2xl relative rounded-md text-[#fbfbfa]">
        <button
          onClick={onClose}
          aria-label="Close guide"
          className="absolute top-4 right-4 text-[#a3a3a3] hover:text-[#fbfbfa] p-1 cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 shrink-0 bg-[#262422] border border-[#c5a47e] p-1.5 flex items-center justify-center rounded">
            <SenoMarkIcon size={36} className="w-9 h-9 shrink-0" />
          </div>
          <div>
            <span className="text-[10px] tracking-[1.5px] uppercase font-semibold text-[#c5a47e] block">
              iOS Installation
            </span>
            <h3 id="ios-guide-title" className="text-sm font-medium tracking-tight text-[#fbfbfa]">
              Add SENO to Home Screen
            </h3>
          </div>
        </div>

        <ol className="space-y-3.5 text-xs text-[#e5e5e5] mb-6 border-t border-[#33312e] pt-4">
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#c5a47e] text-[#171717] text-[10px] font-bold shrink-0 mt-0.5">
              1
            </span>
            <span>
              Tap the <strong className="font-semibold text-[#fbfbfa]">Share</strong> button in Safari&apos;s toolbar{' '}
              <Share size={13} className="inline ml-1 text-[#38bdf8]" />
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#c5a47e] text-[#171717] text-[10px] font-bold shrink-0 mt-0.5">
              2
            </span>
            <span>
              Scroll down and tap <strong className="font-semibold text-[#fbfbfa]">Add to Home Screen</strong>{' '}
              <PlusSquare size={13} className="inline ml-1 text-[#c5a47e]" />
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#c5a47e] text-[#171717] text-[10px] font-bold shrink-0 mt-0.5">
              3
            </span>
            <span>
              Tap <strong className="font-semibold text-[#fbfbfa]">Add</strong> in the top-right corner to finish.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#c5a47e] text-[#171717] text-xs tracking-wider uppercase font-semibold hover:bg-[#d4af37] transition-colors cursor-pointer text-center rounded-sm"
        >
          Got It
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DesktopGuideModal
// Instructions for Chrome, Edge, and Desktop Safari users
// ─────────────────────────────────────────────────────────────────────────────
function DesktopGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-[#171717] border border-[#c5a47e] max-w-md w-full p-6 shadow-2xl relative rounded-md text-[#fbfbfa]">
        <button
          onClick={onClose}
          aria-label="Close guide"
          className="absolute top-4 right-4 text-[#a3a3a3] hover:text-[#fbfbfa] p-1 cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 shrink-0 bg-[#262422] border border-[#c5a47e] p-1.5 flex items-center justify-center rounded">
            <SenoMarkIcon size={36} className="w-9 h-9 shrink-0" />
          </div>
          <div>
            <span className="text-[10px] tracking-[1.5px] uppercase font-semibold text-[#c5a47e] block">
              Desktop Installation
            </span>
            <h3 id="desktop-guide-title" className="text-sm font-medium tracking-tight text-[#fbfbfa]">
              Install SENO on Your Computer
            </h3>
          </div>
        </div>

        <div className="space-y-4 text-xs text-[#e5e5e5] mb-6 border-t border-[#33312e] pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#262422] text-[#c5a47e] shrink-0 mt-0.5">
              <Monitor size={16} />
            </div>
            <div>
              <strong className="text-[#fbfbfa] block font-semibold mb-0.5">Chrome or Microsoft Edge:</strong>
              Look for the <strong className="text-[#c5a47e]">Install</strong> icon in the address bar (next to the bookmark star), or open the browser menu (⋮) and select <strong className="text-[#c5a47e]">Install SENO...</strong>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-[#262422] text-[#c5a47e] shrink-0 mt-0.5">
              <Smartphone size={16} />
            </div>
            <div>
              <strong className="text-[#fbfbfa] block font-semibold mb-0.5">Apple Safari (macOS Sonoma+):</strong>
              Click <strong className="text-[#c5a47e]">File</strong> in the top menu bar, then choose <strong className="text-[#c5a47e]">Add to Dock...</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-[#c5a47e] text-[#171717] text-xs tracking-wider uppercase font-semibold hover:bg-[#d4af37] transition-colors cursor-pointer text-center rounded-sm"
        >
          Got It
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
  const { canInstall, isStandalone, triggerInstall } = usePwaInstall()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isStandalone || !canInstall) return null

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
