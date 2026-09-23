'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { X, Share, PlusSquare } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePwaInstall
// Captures the beforeinstallprompt event and tracks install/standalone state.
// Does NOT automatically show any UI — callers decide when to render.
// ─────────────────────────────────────────────────────────────────────────────
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if already running as installed PWA
    const standaloneMode =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(Boolean(standaloneMode))
    if (standaloneMode) return

    // Detect iOS/Safari (no beforeinstallprompt support)
    const ua = window.navigator.userAgent.toLowerCase()
    const ios =
      /iphone|ipad|ipod/.test(ua) &&
      !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIos(ios)

    if (ios) {
      // iOS Safari supports manual Add to Home Screen — mark as supported
      setIsSupported(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsSupported(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
      setIsSupported(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const triggerInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return outcome
    }
    if (isIos) return 'ios'
    return 'unavailable'
  }, [deferredPrompt, isIos])

  return { isSupported, isStandalone, isIos, triggerInstall }
}

// ─────────────────────────────────────────────────────────────────────────────
// FooterInstallButton
// A persistent, low-profile install entry point styled to match footer links.
// Renders nothing when: already installed (standalone) or browser unsupported.
// iOS users see a step-by-step guide modal when they click; other supported
// browsers immediately receive the native install prompt.
// ─────────────────────────────────────────────────────────────────────────────
export function FooterInstallButton() {
  const { isSupported, isStandalone, isIos, triggerInstall } = usePwaInstall()
  const [showIosGuide, setShowIosGuide] = useState(false)

  // Don't render if already installed or browser cannot install
  if (isStandalone || !isSupported) return null

  const handleClick = async () => {
    const result = await triggerInstall()
    if (result === 'ios') {
      setShowIosGuide(true)
    }
  }

  const handleCloseGuide = () => setShowIosGuide(false)

  return (
    <>
      {/* Footer install link — matches existing footer link style via CSS class */}
      <li>
        <button
          type="button"
          onClick={handleClick}
          className="footer-install-btn"
          aria-label="Install SENO app"
          id="footer-pwa-install-btn"
        >
          Install App
        </button>
      </li>

      {/* iOS Manual Installation Guide Modal — only shown on explicit user click */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-guide-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseGuide() }}
        >
          <div className="bg-[var(--surface,#ffffff)] border border-[var(--border,#e2e1dc)] max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={handleCloseGuide}
              aria-label="Close guide"
              className="absolute top-4 right-4 text-[var(--muted,#676767)] hover:text-[var(--ink,#171717)] p-1 cursor-pointer transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 shrink-0 bg-[var(--bg,#fbfbfa)] border border-[var(--border,#e2e1dc)] p-1 flex items-center justify-center">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="SENO"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <h3 id="ios-guide-title" className="text-sm font-medium tracking-tight">Add SENO to Home Screen</h3>
                <p className="text-[11px] text-[var(--muted,#676767)]">Install on your iPhone or iPad</p>
              </div>
            </div>

            <ol className="space-y-3 text-xs text-[var(--ink,#171717)] mb-6">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--soft,#f1f1ef)] text-[10px] font-medium shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Tap the <strong className="font-semibold">Share</strong> button in Safari&apos;s bottom toolbar <Share size={13} className="inline ml-1 text-sky-600" />
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--soft,#f1f1ef)] text-[10px] font-medium shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Scroll down and tap <strong className="font-semibold">Add to Home Screen</strong> <PlusSquare size={13} className="inline ml-1" />
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--soft,#f1f1ef)] text-[10px] font-medium shrink-0 mt-0.5">
                  3
                </span>
                <span>Tap <strong className="font-semibold">Add</strong> in the top right corner.</span>
              </li>
            </ol>

            <button
              onClick={handleCloseGuide}
              className="w-full py-2.5 bg-[var(--ink,#171717)] text-[var(--bg,#fbfbfa)] text-xs tracking-wider uppercase font-medium hover:opacity-90 transition-opacity cursor-pointer text-center"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
