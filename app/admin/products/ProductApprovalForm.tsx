'use client'

import { useState } from 'react'
import { updateProductApproval } from '@/lib/admin'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  productId: string
  currentStatus: string
  currentReason: string
}

export function ProductApprovalForm({ productId, currentStatus, currentReason }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [reason, setReason] = useState(currentReason || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    try {
      await updateProductApproval(productId, status, reason)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      alert(err.message || 'Failed to update approval status')
    } finally {
      setLoading(false)
    }
  }

  const quickUpdate = async (nextStatus: string, nextReason = '') => {
    setLoading(true)
    try {
      await updateProductApproval(productId, nextStatus, nextReason)
      setStatus(nextStatus)
      setReason(nextReason)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      alert(err.message || 'Failed to update approval status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button type="button" disabled={loading} className="button button-outline" style={{ fontSize: '10px', padding: '5px 8px' }} onClick={() => quickUpdate('approved')}>Approve</button>
        <button type="button" disabled={loading} className="button button-outline" style={{ fontSize: '10px', padding: '5px 8px' }} onClick={() => quickUpdate('rejected', 'Changes requested by SENO admin.')}>Request Changes</button>
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
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
            'Apply'
          )}
        </button>
      </div>
      {status === 'rejected' && (
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for rejection..."
          style={{
            width: '200px',
            height: '28px',
            padding: '0 8px',
            fontSize: '11px',
            border: '1px solid var(--border)',
            borderRadius: '3px',
            background: '#fff',
            outline: 'none'
          }}
          required={status === 'rejected'}
        />
      )}
    </form>
  )
}

