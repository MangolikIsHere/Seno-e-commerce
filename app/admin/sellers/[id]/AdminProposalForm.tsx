'use client'

import { useState } from 'react'
import { proposeCommission, approveCommissionRequest, updateSellerStatus } from '@/lib/admin'
import { Loader2 } from 'lucide-react'

interface Props {
  sellerId: string
  status: string
  currentCommission?: number
  activeProposal?: any
}

export function AdminProposalForm({ sellerId, status, currentCommission, activeProposal }: Props) {
  const [rate, setRate] = useState<string>(
    activeProposal?.seller_requested_rate?.toString() || 
    activeProposal?.proposed_rate?.toString() || 
    (currentCommission != null && currentCommission > 0 ? currentCommission.toString() : '15')
  )
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      await proposeCommission(sellerId, parseFloat(rate), message)
      setMessage('')
      setSuccessMessage('Commission proposal sent successfully.')
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveRequest = async () => {
    if (!activeProposal || !activeProposal.seller_requested_rate) return
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      await approveCommissionRequest(sellerId, activeProposal.id, activeProposal.seller_requested_rate)
      setSuccessMessage('Seller commission approved.')
    } catch (err: any) {
      setError(err.message || 'Failed to approve commission request.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickApprove = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      const parsedRate = parseFloat(rate) || 15
      await updateSellerStatus(sellerId, 'approved', parsedRate)
      setSuccessMessage('Seller approved successfully.')
    } catch (err: any) {
      setError(err.message || 'Failed to approve seller.')
    } finally {
      setLoading(false)
    }
  }

  const handleRejectApplication = async () => {
    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      await updateSellerStatus(sellerId, 'rejected')
      setSuccessMessage('Seller application marked as rejected.')
    } catch (err: any) {
      setError(err.message || 'Failed to reject seller.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'commission_proposed') {
    const proposedRate = activeProposal?.proposed_rate ?? currentCommission ?? rate
    return (
      <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '4px' }}>
        <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
          Proposal of <strong>{proposedRate}%</strong> sent. Waiting for seller to accept or request a different rate.
        </p>
      </div>
    )
  }

  if (status === 'approved') {
    const displayRate = currentCommission != null ? currentCommission : (activeProposal?.proposed_rate || rate)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '4px' }}>
          <p style={{ fontSize: '13px', margin: 0 }}>
            Seller is approved with an active commission rate of <strong>{displayRate}%</strong>.
          </p>
        </div>

        <form onSubmit={handlePropose} style={{ background: '#fff', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
            Adjust Commission Rate
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)' }}>New Rate (%)</label>
            <input 
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="input-field"
              style={{ width: '90px' }}
            />
            <button 
              type="submit"
              disabled={loading}
              className="button button-outline"
              style={{ fontSize: '11px', padding: '6px 12px' }}
            >
              {loading ? <Loader2 size={12} className="spin" /> : 'Update Rate'}
            </button>
          </div>
          {error && <div style={{ color: '#b91c1c', fontSize: '12px', marginTop: '6px' }}>{error}</div>}
          {successMessage && <div style={{ color: '#166534', fontSize: '12px', marginTop: '6px' }}>{successMessage}</div>}
        </form>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '4px' }}>
          <p style={{ fontSize: '13px', margin: 0, fontWeight: 600 }}>
            Seller Application Rejected
          </p>
          <p style={{ fontSize: '12px', color: '#7f1d1d', margin: '4px 0 0' }}>
            This application is currently marked as rejected. You can propose a new commission rate to reconsider or approve the partner.
          </p>
        </div>

        <form onSubmit={handlePropose} style={{ background: '#fff' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
            Propose Terms & Reconsider
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
              placeholder="e.g., We can reconsider your application with updated terms..."
            />
          </div>

          {error && <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '16px' }}>{error}</div>}
          {successMessage && <div style={{ color: '#166534', fontSize: '12px', marginBottom: '16px' }}>{successMessage}</div>}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="submit"
              disabled={loading}
              className="button button-primary"
              style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : 'Send Proposal'}
            </button>
            <button
              type="button"
              onClick={handleQuickApprove}
              disabled={loading}
              className="button button-outline"
              style={{ fontSize: '11px', padding: '6px 14px' }}
            >
              Approve Instead
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (status === 'suspended') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: '4px' }}>
          <p style={{ fontSize: '13px', margin: 0, fontWeight: 600 }}>
            Account Suspended
          </p>
          <p style={{ fontSize: '12px', color: '#78350f', margin: '4px 0 0' }}>
            This partner is currently suspended from selling on the marketplace.
          </p>
        </div>

        <button 
          onClick={handleQuickApprove}
          disabled={loading}
          className="button button-primary"
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          {loading ? <Loader2 size={16} className="spin" /> : 'Reactivate Seller'}
        </button>
      </div>
    )
  }

  return (
    <div>
      {status === 'commission_negotiation' && activeProposal?.seller_requested_rate && (
        <div style={{ marginBottom: '24px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px' }}>
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
        {successMessage && <div style={{ color: '#166534', fontSize: '12px', marginBottom: '16px' }}>{successMessage}</div>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="submit"
            disabled={loading}
            className="button button-primary"
            style={{ flex: 1, display: 'flex', justifyContent: 'center' }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : 'Send Proposal'}
          </button>
          {status === 'pending' && (
            <>
              <button
                type="button"
                onClick={handleQuickApprove}
                disabled={loading}
                className="button button-outline"
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                Direct Approve
              </button>
              <button
                type="button"
                onClick={handleRejectApplication}
                disabled={loading}
                className="button button-outline"
                style={{ fontSize: '11px', padding: '6px 12px', color: '#991b1b', borderColor: '#fecaca' }}
              >
                Reject
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
