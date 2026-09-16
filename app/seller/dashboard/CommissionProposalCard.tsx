'use client'

import { useState } from 'react'
import { acceptCommissionProposal, requestCommissionChange } from '@/lib/sellers'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Props {
  proposal: any
  status: string
}

export function CommissionProposalCard({ proposal, status }: Props) {
  const [showNegotiate, setShowNegotiate] = useState(false)
  const [requestedRate, setRequestedRate] = useState(proposal.proposed_rate.toString())
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    setLoading(true)
    try {
      await acceptCommissionProposal(proposal.id)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleNegotiate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await requestCommissionChange(proposal.id, parseFloat(requestedRate), reason)
      setShowNegotiate(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'commission_negotiation') {
    return (
      <div style={{ padding: '32px', border: '1px solid var(--border)', background: 'var(--surface-subtle)', textAlign: 'center' }}>
        <ClockIcon size={40} color="var(--muted)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '20px', fontFamily: 'Georgia, serif', margin: '0 0 12px' }}>Review in Progress</h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
          You have requested a commission rate of <strong>{proposal.seller_requested_rate}%</strong>.<br/>
          SENO administration is currently reviewing your request.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', border: '1px solid var(--border)', background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>
            Current Proposal
          </div>
          <div style={{ fontSize: '40px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>
            {proposal.proposed_rate}%
          </div>
        </div>
        
        {!showNegotiate && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setShowNegotiate(true)}
              className="button button-outline"
              disabled={loading}
              style={{ fontSize: '12px', padding: '10px 20px' }}
            >
              Request Different Rate
            </button>
            <button 
              onClick={handleAccept}
              className="button button-primary"
              disabled={loading}
              style={{ fontSize: '12px', padding: '10px 20px', minWidth: '160px', display: 'inline-flex', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : 'Accept Proposal'}
            </button>
          </div>
        )}
      </div>

      {proposal.admin_message && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>
            Message from SENO
          </div>
          <div style={{ fontSize: '14px', color: 'var(--ink)', background: 'var(--surface-subtle)', padding: '16px', borderLeft: '3px solid var(--ink)' }}>
            {proposal.admin_message}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {showNegotiate && (
        <form onSubmit={handleNegotiate} style={{ marginTop: '32px', background: 'var(--surface-subtle)', padding: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: '16px', margin: '0 0 16px' }}>Request Commission Change</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Requested Rate (%)</label>
            <input 
              type="number"
              step="0.1"
              min="0"
              max="100"
              required
              value={requestedRate}
              onChange={e => setRequestedRate(e.target.value)}
              className="input-field"
              style={{ width: '120px' }}
            />
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Reason for Request</label>
            <textarea
              required
              minLength={10}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="input-field"
              style={{ minHeight: '100px', width: '100%' }}
              placeholder="Please explain why you are requesting this rate..."
            />
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button"
              onClick={() => setShowNegotiate(false)}
              className="button button-outline"
              disabled={loading}
              style={{ fontSize: '12px', padding: '10px 20px' }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="button button-primary"
              disabled={loading}
              style={{ fontSize: '12px', padding: '10px 20px', minWidth: '160px', display: 'inline-flex', justifyContent: 'center' }}
            >
              {loading ? <Loader2 size={16} className="spin" /> : 'Submit Request'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function ClockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
