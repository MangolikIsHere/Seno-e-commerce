'use client'

import { useState } from 'react'
import { proposeCommission, approveCommissionRequest, updateSellerStatus } from '@/lib/admin'
import { Loader2 } from 'lucide-react'

interface Props {
  sellerId: string
  status: string
  activeProposal?: any
}

export function AdminProposalForm({ sellerId, status, activeProposal }: Props) {
  const [rate, setRate] = useState(
    activeProposal?.seller_requested_rate?.toString() || 
    activeProposal?.proposed_rate?.toString() || 
    '15'
  )
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await proposeCommission(sellerId, parseFloat(rate), message)
      setMessage('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async () => {
    if (!activeProposal || !activeProposal.seller_requested_rate) return
    setLoading(true)
    setError('')
    try {
      await approveCommissionRequest(sellerId, activeProposal.id, activeProposal.seller_requested_rate)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRejectApplication = async () => {
    setLoading(true)
    setError('')
    try {
      await updateSellerStatus(sellerId, 'rejected')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'commission_proposed') {
    return (
      <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid var(--border)' }}>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
          Proposal sent. Waiting for seller to accept or request a different rate.
        </p>
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
        <p style={{ fontSize: '13px', margin: 0 }}>
          Seller is approved with an active commission rate of <strong>{activeProposal?.proposed_rate || activeProposal?.seller_requested_rate}%</strong>.
        </p>
      </div>
    )
  }

  return (
    <div>
      {status === 'commission_negotiation' && activeProposal?.seller_requested_rate && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>
            Seller Change Request
          </div>
          <div style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '16px' }}>
            The seller requested a rate of <strong>{activeProposal.seller_requested_rate}%</strong>.<br/>
            Reason: <em>"{activeProposal.seller_request_reason}"</em>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleApproveRequest}
              disabled={loading}
              className="button button-primary"
              style={{ fontSize: '11px', padding: '6px 12px', background: '#166534', borderColor: '#166534' }}
            >
              {loading ? <Loader2 size={14} className="spin" /> : 'Approve Requested Rate'}
            </button>
            <button 
              onClick={handleRejectApplication}
              disabled={loading}
              className="button button-outline"
              style={{ fontSize: '11px', padding: '6px 12px', color: '#991b1b', borderColor: '#fecaca' }}
            >
              Reject Application
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handlePropose} style={{ background: '#fff' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
          {status === 'commission_negotiation' ? 'Send Counter Proposal' : 'Propose Commission'}
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Commission Rate (%)</label>
          <input 
            type="number"
            step="0.1"
            min="0"
            max="100"
            required
            value={rate}
            onChange={e => setRate(e.target.value)}
            className="input-field"
            style={{ width: '100px' }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Message to Seller (Optional)</label>
          <textarea 
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="input-field"
            style={{ width: '100%', minHeight: '80px' }}
            placeholder="e.g., We can offer 12% given your projected volume..."
          />
        </div>

        {error && <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '16px' }}>{error}</div>}

        <button 
          type="submit"
          disabled={loading}
          className="button button-primary"
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          {loading ? <Loader2 size={16} className="spin" /> : 'Send Proposal'}
        </button>
      </form>
    </div>
  )
}
