'use client'

import React, { useState, useEffect } from 'react'
import { X, Check, Copy, Share2, ExternalLink, Sparkles } from 'lucide-react'
import { SenoImage } from '@/components/SenoImage'
import { money } from '@/lib/catalog'
import { SITE_URL } from '@/lib/seo'

export interface ShareProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: {
    name: string
    slug: string
    price: number
    compareAtPrice?: number | null
    image?: string
    images?: string[]
    description?: string
    category?: string
    selectedColour?: string
  }
}

export function ShareProductModal({ isOpen, onClose, product }: ShareProductModalProps) {
  const [copied, setCopied] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)

  const productUrl = `${SITE_URL}/products/${product.slug}${
    product.selectedColour ? `?colour=${encodeURIComponent(product.selectedColour)}` : ''
  }`

  const primaryImage = product.images?.[0] || product.image || `${SITE_URL}/brand/seno-mark-512.png`
  const hasDiscount = Boolean(product.compareAtPrice && product.compareAtPrice > product.price)
  const discountAmount = hasDiscount ? (product.compareAtPrice! - product.price) : 0
  const discountPct = hasDiscount ? Math.round((discountAmount / product.compareAtPrice!) * 100) : 0

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setHasNativeShare(true)
    }
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(productUrl)
      } else {
        const input = document.createElement('input')
        input.value = productUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      // Fallback
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | SENO`,
          text: `Explore ${product.name} at SENO — ${money(product.price)}`,
          url: productUrl,
        })
      } catch {
        // User cancelled or share dismissed
      }
    } else {
      handleCopyLink()
    }
  }

  const whatsappMessage = encodeURIComponent(
    `*${product.name.toUpperCase()}* — SENO\n` +
    `Price: ${money(product.price)}${hasDiscount ? ` (MRP: ${money(product.compareAtPrice!)} • ${discountPct}% OFF)` : ''}\n` +
    `${product.description ? `${product.description.slice(0, 100)}...\n` : ''}` +
    `\nView piece: ${productUrl}`
  )
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Share ${product.name}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '440px',
          borderRadius: '4px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            background: '#fafafa'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={15} color="var(--ink)" />
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink)' }}>
              Share Piece
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share preview"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Social Card Preview */}
        <div style={{ padding: '18px 20px' }}>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '4px',
              overflow: 'hidden',
              background: '#ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              marginBottom: '16px'
            }}
          >
            {/* Visual Header */}
            <div style={{ position: 'relative', width: '100%', height: '180px', background: '#f5f5f5', overflow: 'hidden' }}>
              <SenoImage
                src={primaryImage}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  background: 'rgba(0,0,0,0.75)',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '1.2px',
                  padding: '3px 8px',
                  borderRadius: '2px',
                  textTransform: 'uppercase'
                }}
              >
                SENO LUXURY
              </div>

              {hasDiscount && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: '#166534',
                    color: '#ffffff',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    letterSpacing: '0.6px',
                    padding: '3px 8px',
                    borderRadius: '2px'
                  }}
                >
                  {discountPct}% OFF
                </div>
              )}
            </div>

            {/* Card Body */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '3px' }}>
                {product.category || 'SENO COLLECTION'}
              </div>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px', lineHeight: 1.3 }}>
                {product.name}
              </h4>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                  {money(product.price)}
                </span>
                {hasDiscount && (
                  <>
                    <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--muted)' }}>
                      {money(product.compareAtPrice!)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                      Save {money(discountAmount)}
                    </span>
                  </>
                )}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ExternalLink size={11} />
                <span>www.seno.co.in/products/{product.slug}</span>
              </div>
            </div>
          </div>

          {/* Share Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* WhatsApp 1-Click Action */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 16px',
                background: '#25D366',
                color: '#ffffff',
                borderRadius: '3px',
                fontSize: '12.5px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textDecoration: 'none',
                transition: 'opacity 0.15s ease'
              }}
            >
              <span>Share on WhatsApp</span>
            </a>

            {/* Native Share on Supported Devices */}
            {hasNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '11px 16px',
                  background: 'var(--ink)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  cursor: 'pointer'
                }}
              >
                <Share2 size={14} />
                <span>Share via Device Sheet</span>
              </button>
            )}

            {/* Copy Link Action */}
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '11px 16px',
                background: copied ? '#ecfdf5' : '#ffffff',
                color: copied ? '#065f46' : 'var(--ink)',
                border: copied ? '1px solid #a7f3d0' : '1px solid var(--border)',
                borderRadius: '3px',
                fontSize: '12.5px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {copied ? (
                <>
                  <Check size={14} color="#065f46" />
                  <span>Link Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Product Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div style={{ padding: '10px 18px', background: '#fafafa', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '10.5px', color: 'var(--muted)' }}>
            Previews display high-resolution imagery and genuine pricing when shared on WhatsApp, iMessage, and social media.
          </p>
        </div>
      </div>
    </div>
  )
}

