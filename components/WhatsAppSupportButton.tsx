'use client'

import React from 'react'
import { getWhatsAppSupportUrl, WhatsAppSupportType, SENO_WHATSAPP_NUMBER } from '@/lib/whatsapp'

export function WhatsAppIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413Z" />
    </svg>
  )
}

export interface WhatsAppSupportButtonProps {
  type?: WhatsAppSupportType
  orderNumber?: string
  customMessage?: string
  label?: string
  variant?: 'primary' | 'outline' | 'subtle' | 'compact' | 'text'
  className?: string
  style?: React.CSSProperties
  iconSize?: number
  ariaLabel?: string
}

export function WhatsAppSupportButton({
  type = 'general',
  orderNumber,
  customMessage,
  label = 'WhatsApp Support',
  variant = 'primary',
  className = '',
  style,
  iconSize = 15,
  ariaLabel
}: WhatsAppSupportButtonProps) {
  const url = getWhatsAppSupportUrl({ type, orderNumber, customMessage })

  const baseAriaLabel =
    ariaLabel ||
    (orderNumber
      ? `Contact SENO on WhatsApp regarding order #${orderNumber} at ${SENO_WHATSAPP_NUMBER} (opens in new tab)`
      : `Contact SENO on WhatsApp at ${SENO_WHATSAPP_NUMBER} (opens in new tab)`)

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'outline':
        return {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: '#ffffff',
          color: 'var(--ink)',
          border: '1px solid var(--border)',
          borderRadius: '2px',
          padding: '10px 18px',
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.5px',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease, background 0.2s ease'
        }
      case 'subtle':
        return {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          background: 'var(--soft)',
          color: 'var(--ink)',
          border: '1px solid transparent',
          borderRadius: '2px',
          padding: '8px 14px',
          fontSize: '11.5px',
          fontWeight: 500,
          textDecoration: 'none',
          cursor: 'pointer'
        }
      case 'compact':
        return {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          background: 'transparent',
          color: 'var(--ink)',
          border: '1px solid var(--border)',
          borderRadius: '2px',
          padding: '6px 12px',
          fontSize: '11px',
          letterSpacing: '0.4px',
          textDecoration: 'none',
          cursor: 'pointer'
        }
      case 'text':
        return {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          color: 'var(--ink)',
          border: 'none',
          padding: 0,
          fontSize: '12.5px',
          fontWeight: 500,
          textDecoration: 'underline',
          cursor: 'pointer'
        }
      case 'primary':
      default:
        return {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'var(--ink)',
          color: '#ffffff',
          border: '1px solid var(--ink)',
          borderRadius: '2px',
          padding: '10px 20px',
          fontSize: '11.5px',
          fontWeight: 600,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          textDecoration: 'none',
          cursor: 'pointer',
          transition: 'opacity 0.2s ease'
        }
    }
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={baseAriaLabel}
      className={`seno-whatsapp-btn ${className}`}
      style={{ ...getVariantStyles(), ...style }}
    >
      <WhatsAppIcon size={iconSize} />
      <span>{label}</span>
    </a>
  )
}
