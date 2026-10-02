'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

interface ProductErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ProductError({ error, reset }: ProductErrorProps) {
  useEffect(() => {
    // Log unexpected product render failure
    console.error('[SENO Product Error Boundary]', error)
  }, [error])

  return (
    <div
      className="product-detail-container"
      style={{
        minHeight: '65vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 20px',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--muted, #888)',
          marginBottom: '12px',
        }}
      >
        Garment Retrieval
      </span>

      <h1
        style={{
          fontFamily: 'var(--font-outfit), sans-serif',
          fontSize: '24px',
          fontWeight: 500,
          color: 'var(--ink, #111)',
          marginBottom: '12px',
          letterSpacing: '-0.5px',
        }}
      >
        Unable to Load Product
      </h1>

      <p
        style={{
          fontSize: '13.5px',
          color: 'var(--muted, #666)',
          maxWidth: '420px',
          lineHeight: '1.6',
          marginBottom: '32px',
        }}
      >
        An intermittent connection delay occurred while loading this piece from the catalog.
      </p>

      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--ink, #111)',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            fontSize: '12px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '2px',
            fontWeight: 500,
          }}
        >
          <RefreshCw size={14} /> Try Again
        </button>

        <Link
          href="/collections/all"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            color: 'var(--ink, #111)',
            border: '1px solid var(--border, #ccc)',
            padding: '12px 24px',
            fontSize: '12px',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            borderRadius: '2px',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={14} /> Return to Catalog
        </Link>
      </div>
    </div>
  )
}
