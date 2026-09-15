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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {error && <div style={{ color: '#b91c1c', fontSize: '11px' }}>{error}</div>}
      {success && <div style={{ color: '#15803d', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> Dispatched / Updated</div>}

      <div>
        <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '4px' }}>Fulfillment State</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px', background: '#fff', outline: 'none' }}
        >
          <option value="unfulfilled">Unfulfilled</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '4px' }}>Logistics Carrier</label>
        <input
          type="text"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="e.g. DHL, BlueDart, Delhivery"
          style={{ width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px', background: '#fff', outline: 'none' }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '4px' }}>Consignment Tracking #</label>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="e.g. TRK-98721389"
          style={{ width: '100%', height: '32px', padding: '0 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px', background: '#fff', outline: 'none' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="button button-primary"
        style={{ padding: '8px 14px', fontSize: '11px', marginTop: '6px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        {loading ? <Loader2 size={12} className="spin" /> : success ? 'Updated' : 'Update Fulfillment'}
      </button>
    </form>
  )
}

