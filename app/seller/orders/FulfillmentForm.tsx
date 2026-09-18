'use client'

import { useState } from 'react'
import { updateFulfillmentStatus } from '@/lib/sellers'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  orderItemId: string
  initialStatus: string
  initialTracking: string
  initialCarrier: string
}

export function FulfillmentForm({ orderItemId, initialStatus, initialTracking, initialCarrier }: Props) {
  const [status, setStatus] = useState(initialStatus)
  const [tracking, setTracking] = useState(initialTracking)
  const [carrier, setCarrier] = useState(initialCarrier)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await updateFulfillmentStatus(orderItemId, status, tracking, carrier)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && <div style={{ color: '#b91c1c', fontSize: '11px', background: '#fef2f2', padding: '6px 10px', borderRadius: '2px', border: '1px solid #fecaca' }}>{error}</div>}
      {success && <div style={{ color: '#15803d', fontSize: '11px', background: '#f0fdf4', padding: '6px 10px', borderRadius: '2px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={13} strokeWidth={2.5} /> Dispatch details saved</div>}

      <div>
        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Fulfillment State</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="input-field"
          style={{ padding: '8px 12px', fontSize: '12px' }}
        >
          <option value="unfulfilled">Unfulfilled</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Logistics Carrier</label>
        <input
          type="text"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="e.g. DHL, BlueDart, Delhivery"
          className="input-field"
          style={{ padding: '8px 12px', fontSize: '12px' }}
        />
      </div>

      <div>
        <label className="form-label" style={{ fontSize: '10px', marginBottom: '4px' }}>Consignment Tracking #</label>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="e.g. TRK-98721389"
          className="input-field"
          style={{ padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="button button-primary"
        style={{ padding: '9px 14px', fontSize: '11px', marginTop: '4px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        {loading ? <Loader2 size={13} className="spin" /> : success ? 'Saved' : 'Update Fulfillment'}
      </button>
    </form>
  )
}

