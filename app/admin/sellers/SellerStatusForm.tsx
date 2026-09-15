'use client'

import { useState } from 'react'
import { updateSellerStatus } from '@/lib/admin'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  sellerId: string
  currentStatus: string
  currentCommission: number
}

export function SellerStatusForm({ sellerId, currentStatus, currentCommission }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [commission, setCommission] = useState(currentCommission?.toString() ?? '15')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    try {
      await updateSellerStatus(sellerId, status, parseFloat(commission))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      alert(err.message || 'Failed to update seller')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '3px', padding: '0 6px', height: '32px' }}>
        <input
          type="number"
          value={commission}
          onChange={e => setCommission(e.target.value)}
          step="0.5"
          min="0"
          max="100"
          style={{ width: '42px', border: 'none', background: 'transparent', fontSize: '12px', textAlign: 'right', outline: 'none', padding: 0 }}
          title="Commission Rate (%)"
        />
        <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '2px' }}>%</span>
      </div>

      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        style={{
          height: '32px',
          padding: '0 8px',
          fontSize: '12px',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          background: '#fff',
          color: 'var(--ink)',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="suspended">Suspended</option>
      </select>

      <button
        type="submit"
        disabled={loading}
        className="button button-primary"
        style={{
          height: '32px',
          padding: '0 12px',
          fontSize: '11px',
          letterSpacing: '0.5px',
          borderRadius: '3px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        {loading ? (
          <Loader2 size={12} className="spin" />
        ) : saved ? (
          <>
            <Check size={12} />
            <span>Saved</span>
          </>
        ) : (
          'Update'
        )}
      </button>
    </form>
  )
}

