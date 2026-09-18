'use client'

import React, { useState } from 'react'
import { cancelAndRefundOrderItemAction } from '@/lib/sellers'
import { AlertCircle } from 'lucide-react'

export function PaidCancelForm({ orderItemId }: { orderItemId: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      await cancelAndRefundOrderItemAction(orderItemId, 'Cancelled by seller')
      setShowConfirm(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <button 
        type="button" 
        className="button" 
        style={{ color: 'var(--error)', borderColor: 'var(--error)', width: '100%', justifyContent: 'center' }}
        onClick={() => setShowConfirm(true)}
      >
        Cancel Item & Refund
      </button>
    )
  }

  return (
    <div style={{ padding: '16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '13px' }}>
      <div style={{ display: 'flex', gap: '8px', color: 'var(--error)', marginBottom: '8px' }}>
        <AlertCircle size={16} />
        <strong style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '1px' }}>Confirm Cancellation</strong>
      </div>
      <p style={{ margin: '0 0 16px', color: 'var(--muted)' }}>
        This order has already been paid. A refund will be initiated to the customer's original payment method. This action cannot be undone.
      </p>
      
      {error && (
        <div style={{ color: 'var(--error)', marginBottom: '16px', fontSize: '12px', background: '#fff0f0', padding: '8px', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          type="button" 
          className="button" 
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Keep Order
        </button>
        <button 
          type="button" 
          className="button button-primary" 
          onClick={handleConfirm}
          disabled={loading}
          style={{ flex: 1, justifyContent: 'center', background: 'var(--error)', borderColor: 'var(--error)' }}
        >
          {loading ? 'Processing...' : 'Cancel & Refund'}
        </button>
      </div>
    </div>
  )
}
