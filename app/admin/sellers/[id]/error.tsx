'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react'

interface SellerReviewErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminSellerReviewError({ error, reset }: SellerReviewErrorProps) {
  useEffect(() => {
    console.error('[SENO Admin Seller Review Error]', error)
  }, [error])

  return (
    <div className="admin-page-container">
      <div className="admin-top-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link href="/admin/sellers" className="button button-outline" style={{ padding: '8px', border: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="admin-page-title">Seller Review</h1>
          <p className="admin-page-subtitle">Partner dossier error</p>
        </div>
      </div>

      <div className="admin-table-card" style={{ padding: '48px 24px', textAlign: 'center', marginTop: '24px' }}>
        <AlertCircle size={40} color="#b91c1c" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
          Unable to Load Seller Dossier
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 12px', lineHeight: '1.6' }}>
          An error occurred while fetching the seller review details from the database.
        </p>
        {error?.message && (
          <p style={{ color: '#b91c1c', fontSize: '12px', maxWidth: '480px', margin: '0 auto 24px', fontFamily: 'monospace' }}>
            {error.message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            className="button button-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
          <Link
            href="/admin/sellers"
            className="button button-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={14} />
            <span>Return to Partner Directory</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
