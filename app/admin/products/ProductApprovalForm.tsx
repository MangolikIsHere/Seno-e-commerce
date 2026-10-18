'use client'

import React, { useState } from 'react'
import { updateProductApproval } from '@/lib/admin'
import { Check, Loader2, AlertCircle, X, HelpCircle } from 'lucide-react'
import { AFFECTED_FIELDS, AffectedFieldKey } from '@/lib/revisionFeedback'

interface Props {
  productId: string
  productName?: string
  currentStatus: string
  currentReason?: string
}

export function ProductApprovalForm({ productId, productName, currentStatus, currentReason }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [affectedFields, setAffectedFields] = useState<AffectedFieldKey[]>([])
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [modalError, setModalError] = useState('')

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus)
    if (newStatus === 'rejected') {
      setShowRevisionModal(true)
    }
  }

  const handleSimpleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'rejected') {
      setShowRevisionModal(true)
      return
    }

    setLoading(true)
    setSaved(false)
    try {
      await updateProductApproval(productId, status)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      alert(err.message || 'Failed to update approval status')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickApprove = async () => {
    setLoading(true)
    try {
      await updateProductApproval(productId, 'approved')
      setStatus('approved')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      alert(err.message || 'Failed to approve product')
    } finally {
      setLoading(false)
    }
  }

  const toggleField = (key: AffectedFieldKey) => {
    setAffectedFields(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!instructions.trim()) {
      setModalError('Please enter specific instructions describing what needs correction.')
      return
    }

    setLoading(true)
    setModalError('')
    try {
      await updateProductApproval(
        productId,
        'rejected',
        instructions.trim(),
        affectedFields,
        additionalNotes.trim()
      )
      setStatus('rejected')
      setShowRevisionModal(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setModalError(err.message || 'Failed to request revisions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSimpleApply} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            disabled={loading} 
            className="button button-outline button-approve-accent" 
            style={{ fontSize: '10px', padding: '5px 8px' }} 
            onClick={handleQuickApprove}
            title="Approve and publish to catalog"
          >
            Approve
          </button>
          <button 
            type="button" 
            disabled={loading} 
            className="button button-outline button-reject-accent" 
            style={{ fontSize: '10px', padding: '5px 8px' }} 
            onClick={() => setShowRevisionModal(true)}
            title="Request specific changes from the seller"
          >
            Request Changes
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value)}
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
            <option value="rejected">Rejected / Needs Revision</option>
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
      </form>

      {/* Structured Revision Feedback Modal */}
      {showRevisionModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={e => {
            if (e.target === e.currentTarget && !loading) setShowRevisionModal(false)
          }}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '6px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--border)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#b45309' }}>
                  Product Review Feedback
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                  Request Product Changes
                </h3>
                {productName && (
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                    For <strong>{productName}</strong>
                  </p>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setShowRevisionModal(false)}
                disabled={loading}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleRevisionSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#991b1b', fontSize: '12.5px' }}>
                  {modalError}
                </div>
              )}

              {/* Required Instructions */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Required Changes & Instructions <span style={{ color: '#b91c1c' }}>*</span>
                </label>
                <textarea
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  required
                  rows={3}
                  className="input-field"
                  style={{ width: '100%', resize: 'vertical', fontSize: '13px', lineHeight: 1.5 }}
                  placeholder="e.g., Please upload high-resolution photos on white backdrop, and correct the XL variant stock count..."
                />
                <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px' }}>
                  The seller will read this exact explanation in their dashboard and product editor.
                </span>
              </div>

              {/* Affected Fields Checkbox Grid */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
                  Specific Sections Requiring Attention (Optional)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                  {(Object.keys(AFFECTED_FIELDS) as AffectedFieldKey[]).map(key => {
                    const field = AFFECTED_FIELDS[key]
                    const isChecked = affectedFields.includes(key)
                    return (
                      <label 
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          border: `1px solid ${isChecked ? 'var(--ink)' : 'var(--border)'}`,
                          background: isChecked ? 'var(--surface-subtle)' : '#fff',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleField(key)}
                          style={{ marginTop: '2px' }}
                        />
                        <div>
                          <div style={{ fontWeight: isChecked ? 600 : 500, color: 'var(--ink)' }}>{field.label}</div>
                          <div style={{ fontSize: '10.5px', color: 'var(--muted)', lineHeight: 1.2 }}>{field.description}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                  Additional Notes or Guidance (Optional)
                </label>
                <input
                  type="text"
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  className="input-field"
                  style={{ width: '100%', fontSize: '12.5px' }}
                  placeholder="e.g., Reference SENO luxury photography guide: link / guideline"
                />
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  disabled={loading}
                  className="button button-outline"
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="button button-primary"
                  style={{ padding: '8px 20px', fontSize: '12px', background: '#b91c1c', borderColor: '#b91c1c', color: '#fff', gap: '6px' }}
                >
                  {loading ? <Loader2 size={13} className="spin" /> : 'Submit Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
