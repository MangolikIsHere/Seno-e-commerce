'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Download,
  Share2,
  Check,
  Copy,
  Smartphone,
  Monitor,
  Apple,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Clock,
  Heart,
  ChevronRight,
  ExternalLink,
  MessageCircle
} from 'lucide-react'
import { usePwaInstall, SenoMarkIcon } from '@/components/PwaInstallPrompt'

export function InstallClient() {
  const {
    canInstall,
    isStandalone,
    isIos,
    isAndroid,
    triggerInstall
  } = usePwaInstall()

  const [mounted, setMounted] = useState(false)
  const [activePlatformTab, setActivePlatformTab] = useState<'ios' | 'android' | 'desktop'>('android')
  const [copied, setCopied] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isIos) {
      setActivePlatformTab('ios')
    } else if (isAndroid) {
      setActivePlatformTab('android')
    } else {
      setActivePlatformTab('desktop')
    }
  }, [isIos, isAndroid])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  const handleInstallClick = async () => {
    if (isStandalone) return
    setInstalling(true)
    try {
      const outcome = await triggerInstall()
      if (outcome === 'accepted') {
        showToast('✓ SENO App successfully added to your device!')
      } else if (outcome === 'ios') {
        setActivePlatformTab('ios')
        const el = document.getElementById('platform-instructions')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      } else if (outcome === 'manual') {
        setActivePlatformTab('desktop')
        const el = document.getElementById('platform-instructions')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }
    } catch (err) {
      console.warn('Install error:', err)
    } finally {
      setInstalling(false)
    }
  }

  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/install`
    }
    return 'https://seno.store/install'
  }

  const handleShare = async () => {
    const shareUrl = getShareUrl()
    const shareData = {
      title: 'SENO — Considered Luxury Fashion',
      text: 'Install the official SENO App for private capsule drops, one-tap direct checkout and elevated shopping.',
      url: shareUrl,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
        showToast('✓ Thank you for sharing SENO!')
        return
      } catch (err: any) {
        if (err?.name === 'AbortError') return
      }
    }

    // Fallback to clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        showToast('✓ Link copied to clipboard! Share on WhatsApp, Instagram or iMessage.')
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      showToast('Share URL: ' + shareUrl)
    }
  }

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl()
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        showToast('✓ Link copied to clipboard!')
        setTimeout(() => setCopied(false), 2500)
      }
    } catch {
      showToast('Share URL: ' + shareUrl)
    }
  }

  const handleWhatsAppShare = () => {
    const shareUrl = getShareUrl()
    const text = encodeURIComponent(
      `Discover SENO: Considered clothing for everyday life. Install the SENO App directly on your phone: ${shareUrl}`
    )
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="install-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="install-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}

      {/* 1. HERO SHOWCASE */}
      <section className="install-hero-section">
        <div className="install-hero-glow" />
        <div className="install-hero-inner">
          <div className="install-badge-row">
            <span className="install-eyebrow-badge">
              <Sparkles size={11} className="install-badge-star" />
              OFFICIAL PROGRESSIVE WEB APP
            </span>
            {isStandalone && (
              <span className="install-status-pill installed">
                <Check size={11} /> INSTALLED ON THIS DEVICE
              </span>
            )}
          </div>

          <h1 className="install-hero-headline">
            SENO at Your Fingertips.
          </h1>

          <p className="install-hero-subtext">
            Considered clothing and objects for a life in motion. Add the official SENO App to your home screen for instant access, private drops, offline resilience, and one-tap direct checkout.
          </p>

          {/* App Card Preview */}
          <div className="install-app-card">
            <div className="install-card-emblem-col">
              <div className="install-app-icon-frame">
                <Image
                  src="/icons/icon-512x512.png"
                  alt="SENO App Official Icon"
                  width={84}
                  height={84}
                  className="install-app-icon-img"
                  priority
                />
              </div>
            </div>

            <div className="install-card-meta-col">
              <div className="install-card-title-row">
                <h2 className="install-app-title">SENO</h2>
                <span className="install-app-ver">v2.0 • PWA</span>
              </div>
              <p className="install-app-tagline">
                Modern Luxury Fashion &amp; Everyday Wardrobe
              </p>
              <div className="install-app-metrics">
                <span className="metric-item">
                  <strong className="metric-val">4.9 ★</strong> Editorial Rating
                </span>
                <span className="metric-dot">•</span>
                <span className="metric-item">
                  <strong className="metric-val">&lt; 3 MB</strong> Zero Storage Bloat
                </span>
                <span className="metric-dot">•</span>
                <span className="metric-item">
                  <strong className="metric-val">1-Tap</strong> Razorpay Checkout
                </span>
              </div>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="install-actions-group">
            {mounted && isStandalone ? (
              <Link href="/" className="install-primary-action-btn open-btn">
                <Sparkles size={16} />
                <span>OPEN SENO APP</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={installing}
                className="install-primary-action-btn install-btn"
                aria-label="Install SENO App to your home screen"
              >
                <Download size={16} />
                <span>{installing ? 'LAUNCHING INSTALL...' : 'INSTALL SENO APP'}</span>
                <ArrowRight size={16} />
              </button>
            )}

            <div className="install-secondary-actions-row">
              <button
                type="button"
                onClick={handleShare}
                className="install-share-action-btn"
                aria-label="Share SENO App with friends"
              >
                <Share2 size={14} />
                <span>SHARE SENO</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="install-whatsapp-action-btn"
                aria-label="Share SENO on WhatsApp"
                title="Share via WhatsApp"
              >
                <MessageCircle size={14} />
                <span>WHATSAPP</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="install-copy-link-btn"
                aria-label="Copy install link to clipboard"
                title="Copy Link"
              >
                {copied ? <Check size={14} className="text-sage" /> : <Copy size={14} />}
                <span>{copied ? 'COPIED' : 'COPY LINK'}</span>
              </button>
            </div>

            <p className="install-platform-note">
              {mounted && (
                isIos
                  ? 'Optimized for Apple iOS Safari. Follow the 3-step guide below.'
                  : isAndroid
                  ? 'Supports native 1-tap installation on Android Chrome & Samsung Internet.'
                  : 'Installs seamlessly on Chrome, Microsoft Edge, and macOS Safari.'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 2. PLATFORM-SPECIFIC INSTRUCTIONS */}
      <section className="install-guide-section" id="platform-instructions">
        <div className="install-section-header">
          <span className="section-kicker">STEP-BY-STEP GUIDE</span>
          <h2 className="install-section-title">How to Add to Your Device</h2>
          <p className="install-section-subtitle">
            No 150MB App Store download required. SENO installs in seconds directly from your browser.
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="install-platform-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activePlatformTab === 'ios'}
            className={`install-tab-btn ${activePlatformTab === 'ios' ? 'active' : ''}`}
            onClick={() => setActivePlatformTab('ios')}
          >
            <Apple size={15} />
            <span>iPhone / iPad</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activePlatformTab === 'android'}
            className={`install-tab-btn ${activePlatformTab === 'android' ? 'active' : ''}`}
            onClick={() => setActivePlatformTab('android')}
          >
            <Smartphone size={15} />
            <span>Android</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activePlatformTab === 'desktop'}
            className={`install-tab-btn ${activePlatformTab === 'desktop' ? 'active' : ''}`}
            onClick={() => setActivePlatformTab('desktop')}
          >
            <Monitor size={15} />
            <span>Mac &amp; PC</span>
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="install-tab-content-wrapper">
          {activePlatformTab === 'ios' && (
            <div className="install-steps-grid" role="tabpanel">
              <div className="install-step-card">
                <span className="step-number">1</span>
                <div className="step-icon-wrap">
                  <Share2 size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Tap the Share Icon</h3>
                <p className="step-desc">
                  Open SENO in <strong>Safari</strong> on your iPhone or iPad, then tap the <strong>Share</strong> button in the bottom menu bar.
                </p>
              </div>

              <div className="install-step-card">
                <span className="step-number">2</span>
                <div className="step-icon-wrap">
                  <Download size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Add to Home Screen</h3>
                <p className="step-desc">
                  Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>

              <div className="install-step-card">
                <span className="step-number">3</span>
                <div className="step-icon-wrap">
                  <Check size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Confirm &amp; Enjoy</h3>
                <p className="step-desc">
                  Tap <strong>Add</strong> in the top-right corner. The official SENO App icon will appear on your home screen immediately.
                </p>
              </div>
            </div>
          )}

          {activePlatformTab === 'android' && (
            <div className="install-steps-grid" role="tabpanel">
              <div className="install-step-card">
                <span className="step-number">1</span>
                <div className="step-icon-wrap">
                  <Zap size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Tap Install SENO</h3>
                <p className="step-desc">
                  Tap the prominent <strong>Install SENO App</strong> button at the top of this page, or open Chrome&apos;s menu (three dots ⋮).
                </p>
              </div>

              <div className="install-step-card">
                <span className="step-number">2</span>
                <div className="step-icon-wrap">
                  <Download size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Confirm Installation</h3>
                <p className="step-desc">
                  When prompted by your browser, tap <strong>Install</strong> or <strong>Add to Home screen</strong>.
                </p>
              </div>

              <div className="install-step-card">
                <span className="step-number">3</span>
                <div className="step-icon-wrap">
                  <Check size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Launch from Home Screen</h3>
                <p className="step-desc">
                  SENO runs in full-screen standalone mode with native performance and smooth navigation.
                </p>
              </div>
            </div>
          )}

          {activePlatformTab === 'desktop' && (
            <div className="install-steps-grid" role="tabpanel">
              <div className="install-step-card">
                <span className="step-number">1</span>
                <div className="step-icon-wrap">
                  <Monitor size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Google Chrome / Edge</h3>
                <p className="step-desc">
                  Click the <strong>Install</strong> icon on the right side of your browser address bar (next to the bookmark star), or choose <strong>Install SENO</strong> from the browser menu.
                </p>
              </div>

              <div className="install-step-card">
                <span className="step-number">2</span>
                <div className="step-icon-wrap">
                  <Apple size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">macOS Safari (Sonoma+)</h3>
                <p className="step-desc">
                  Open SENO in Safari on your Mac, click <strong>File</strong> in the top menu bar, and select <strong>Add to Dock...</strong>
                </p>
              </div>

              <div className="install-step-card">
                <span className="step-number">3</span>
                <div className="step-icon-wrap">
                  <Check size={22} className="step-svg-icon" />
                </div>
                <h3 className="step-title">Dedicated Window</h3>
                <p className="step-desc">
                  SENO launches in its own clean window free from browser tabs, URL bars, and extensions.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. EXCLUSIVE LUXURY BENEFITS */}
      <section className="install-benefits-section">
        <div className="install-section-header">
          <span className="section-kicker">THE SENO ADVANTAGE</span>
          <h2 className="install-section-title">Engineered for Elevated Shopping</h2>
        </div>

        <div className="install-benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon-badge">
              <Zap size={18} />
            </div>
            <h3 className="benefit-card-title">Zero Storage Bloat</h3>
            <p className="benefit-card-desc">
              Takes less than 3 MB of space on your phone, compared to typical 150 MB app store downloads. Instant launch, always up to date.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon-badge">
              <Sparkles size={18} />
            </div>
            <h3 className="benefit-card-title">Private Drops &amp; Capsules</h3>
            <p className="benefit-card-desc">
              Enjoy priority access to limited seasonal runs, prive sales, and studio collection premieres before general release.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon-badge">
              <ShieldCheck size={18} />
            </div>
            <h3 className="benefit-card-title">1-Tap Direct Checkout</h3>
            <p className="benefit-card-desc">
              Seamlessly integrates with Razorpay, UPI, credit cards, and cash on delivery. Fast, encrypted, and frictionless checkout.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon-badge">
              <Clock size={18} />
            </div>
            <h3 className="benefit-card-title">Offline Resilience</h3>
            <p className="benefit-card-desc">
              Pre-caches your wishlist, previous orders, and bag items so you can browse smoothly even in elevators or low connectivity areas.
            </p>
          </div>
        </div>
      </section>

      {/* 4. VISUAL EDITORIAL BANNER */}
      <section className="install-editorial-banner">
        <div className="editorial-banner-img-wrap">
          <Image
            src="/images/seno_beauty_edit.jpg"
            alt="SENO Fashion Editorial Experience"
            fill
            className="editorial-banner-img"
          />
          <div className="editorial-banner-overlay" />
        </div>

        <div className="editorial-banner-content">
          <span className="editorial-banner-kicker">ATELIER CRAFT</span>
          <h2 className="editorial-banner-title">
            Designed in Mumbai. Tailored for Everyday Motion.
          </h2>
          <p className="editorial-banner-text">
            Experience our complete collections of refined silhouettes, natural breathable fabrics, and architectural cuts with the fluid touch of a dedicated app.
          </p>
          <div className="editorial-banner-actions">
            <button
              type="button"
              onClick={handleInstallClick}
              className="install-primary-action-btn install-btn banner-cta"
            >
              <Download size={15} />
              <span>{isStandalone ? 'EXPLORE SENO APP' : 'INSTALL SENO APP'}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="install-share-action-btn banner-share"
            >
              <Share2 size={14} />
              <span>SHARE WITH FRIENDS</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section className="install-faq-section">
        <div className="install-section-header">
          <span className="section-kicker">QUESTIONS &amp; ANSWERS</span>
          <h2 className="install-section-title">Frequently Asked Questions</h2>
        </div>

        <div className="install-faq-list">
          <div className="install-faq-item">
            <h3 className="faq-q">Do I need Apple App Store or Google Play Store?</h3>
            <p className="faq-a">
              No. SENO is built on modern Progressive Web App (PWA) standards. It installs directly from your browser in under 3 seconds without having to download or update massive files from an app store.
            </p>
          </div>

          <div className="install-faq-item">
            <h3 className="faq-q">Is the SENO App secure for payments?</h3>
            <p className="faq-a">
              Yes, 100%. All transactions are processed through Razorpay with end-to-end 256-bit SSL encryption, supporting UPI, Google Pay, PhonePe, Cards, and Net Banking.
            </p>
          </div>

          <div className="install-faq-item">
            <h3 className="faq-q">How do I share the SENO App with someone?</h3>
            <p className="faq-a">
              Simply tap the <strong>SHARE SENO</strong> or <strong>WHATSAPP</strong> button on this page. They will receive a direct link with an official preview and 1-tap installation guide for their specific device.
            </p>
          </div>

          <div className="install-faq-item">
            <h3 className="faq-q">Can I uninstall or remove it easily?</h3>
            <p className="faq-a">
              Yes. Just like any native app on your phone, you can long-press the SENO icon on your home screen and select &ldquo;Remove App&rdquo; or &ldquo;Uninstall&rdquo; at any time.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

