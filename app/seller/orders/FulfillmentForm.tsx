'use client'

import { useState } from 'react'
import { updateFulfillmentStatus } from '@/lib/sellers'
import { Check, Loader2, AlertCircle } from 'lucide-react'

interface Props {
  orderItemId: string
  initialStatus?: string | null
  initialTracking?: string | null
  initialCarrier?: string | null
  initialEstimatedDelivery?: string | null
  onSuccess?: (data: { status: string; tracking: string; carrier: string }) => void
}

export function FulfillmentForm({
  orderItemId,
  initialStatus,
  initialTracking,
  initialCarrier,
  initialEstimatedDelivery,
  onSuccess
}: Props) {
  const [status, setStatus] = useState<string>(initialStatus || 'unfulfilled')
  const [tracking, setTracking] = useState<string>(initialTracking || '')
  const [carrier, setCarrier] = useState<string>(initialCarrier || '')
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    initialEstimatedDelivery ? initialEstimatedDelivery.slice(0, 10) : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await updateFulfillmentStatus(
        orderItemId,
        status,
        tracking,
        carrier,
        estimatedDelivery || undefined
      )

      if (res && (res as any).success === false) {
        setError((res as any).error || 'Failed to update fulfillment.')
        return
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess({ status, tracking, carrier })
      }
      setTimeout(() => setSuccess(false), 3500)
    } catch (err: any) {
      // Retain the entered values so the seller can retry without re-entering
      setError(err?.message || 'Failed to update fulfillment. Please check details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && (
        <div
          role="alert"
          style={{
            color: '#b91c1c',
            fontSize: '12px',
            background: '#fef2f2',
            padding: '10px 12px',
            borderRadius: '4px',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            lineHeight: 1.4
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            color: '#15803d',
            fontSize: '12px',
            background: '#f0fdf4',
            padding: '10px 12px',
            borderRadius: '4px',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={15} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <span>Fulfillment & consignment details persisted successfully.</span>
        </div>
      )}

      <div>
        <label
          htmlFor={`fulfillment-state-${orderItemId}`}
          className="form-label"
          style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          Fulfillment State
        </label>
        <select
          id={`fulfillment-state-${orderItemId}`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={loading}
          className="input-field"
          style={{ width: '100%', padding: '9px 12px', fontSize: '13px', background: '#fff' }}
        >
          <option value="unfulfilled">Unfulfilled / New to Pack</option>
          <option value="processing">Processing / Packing</option>
          <option value="dispatched">Dispatched / Handed to Courier</option>
          <option value="in_transit">In Transit</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
          <option value="delivery_failed">Delivery Failed</option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`logistics-carrier-${orderItemId}`}
          className="form-label"
          style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          Logistics Carrier
        </label>
        <input
          id={`logistics-carrier-${orderItemId}`}
          type="text"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          disabled={loading}
          placeholder="e.g. Delhivery, BlueDart, DTDC, DHL"
          className="input-field"
          style={{ width: '100%', padding: '9px 12px', fontSize: '13px', background: '#fff' }}
        />
      </div>

      <div>
        <label
          htmlFor={`tracking-number-${orderItemId}`}
          className="form-label"
          style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          Consignment Tracking #
        </label>
        <input
          id={`tracking-number-${orderItemId}`}
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          disabled={loading}
          placeholder="e.g. TRK-98721389"
          className="input-field"
          style={{ width: '100%', padding: '9px 12px', fontSize: '13px', fontFamily: 'monospace', background: '#fff' }}
        />
      </div>

      <div>
        <label
          htmlFor={`delivery-date-${orderItemId}`}
          className="form-label"
          style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}
        >
          Estimated Delivery Date (Optional)
        </label>
        <input
          id={`delivery-date-${orderItemId}`}
          type="date"
          value={estimatedDelivery}
          onChange={(e) => setEstimatedDelivery(e.target.value)}
          disabled={loading}
          className="input-field"
          style={{ width: '100%', padding: '9px 12px', fontSize: '13px', background: '#fff' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="button button-primary"
        style={{
          padding: '11px 18px',
          fontSize: '12px',
          fontWeight: 600,
          marginTop: '6px',
          justifyContent: 'center',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          minHeight: '44px',
          touchAction: 'manipulation'
        }}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="spin" />
            <span>Updating Fulfillment...</span>
          </>
        ) : success ? (
          <>
            <Check size={14} />
            <span>Fulfillment Saved</span>
          </>
        ) : (
          'Update Fulfillment'
        )}
      </button>
    </form>
  )
}
