'use client'

import React, { useState } from 'react'
import { Printer, AlertTriangle, CheckCircle2, RotateCcw, X, ShieldAlert } from 'lucide-react'
import { cancelAdminOrderAction, refundAdminOrderAction } from '@/lib/admin'
import { PrintReceiptTrigger } from '@/components/receipt/PrintReceiptTrigger'
import { money } from '@/lib/catalog'

export interface AdminOrderActionsProps {
  order: any
}

export function AdminOrderActions({ order }: AdminOrderActionsProps) {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isUnpaid = order.payment_status === 'unpaid' && order.status !== 'cancelled'
  const isPaid = order.payment_status === 'paid'
  const isRefunded = order.payment_status === 'refunded' || order.status === 'refunded'
  const totalAmount = Number(order.total_amount || 0)

  const handleCancel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('orderId', order.id)
      await cancelAdminOrderAction(formData)
      setShowCancelModal(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel order.')
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('orderId', order.id)
      await refundAdminOrderAction(formData)
      setShowRefundModal(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to process refund.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      {/* 1. Print Receipt Trigger */}
      <PrintReceiptTrigger
        order={order}
        audience="admin"
        label="Print Receipt"
        className="button button-ghost"
        style={{
          border: '1px solid var(--border)',
          background: '#ffffff',
          color: 'var(--ink)'
        }}
      />

      {/* 2. Cancel Unpaid Reservation (Safe Modal) */}
      {isUnpaid && (
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="button button-outline"
          style={{ borderColor: '#b91c1c', color: '#b91c1c', fontSize: '12px', padding: '7px 14px' }}
        >
          Cancel Order
        </button>
      )}

      {/* 3. Refund Workflow for Paid Orders */}
      {isPaid && !isRefunded && (
        <button
          type="button"
          onClick={() => setShowRefundModal(true)}
          className="button button-outline"
          style={{
            borderColor: '#9a3412',
            color: '#9a3412',
            fontSize: '12px',
            padding: '7px 14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RotateCcw size={13} />
          <span>Refund {money(totalAmount)}</span>
        </button>
      )}

      {/* 4. Refunded Status Indicator */}
      {isRefunded && (
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#b91c1c',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '4px 10px',
            borderRadius: '2px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <RotateCcw size={12} />
          <span>REFUNDED: {money(totalAmount)}</span>
        </span>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '4px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', marginBottom: '12px' }}>
              <ShieldAlert size={22} />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                Cancel Order #{order.order_number}
              </h3>
            </div>

            <p style={{ fontSize: '13px', color: '#444444', lineHeight: 1.5, margin: '0 0 16px' }}>
              This will cancel the order reservation and release all reserved inventory items back to the active catalog.
              If payment has already been captured, the customer may be eligible for a refund.
            </p>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', fontSize: '12px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCancel} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={loading}
                className="button button-outline"
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Keep Order
              </button>
              <button
                type="submit"
                disabled={loading}
                className="button"
                style={{
                  background: '#b91c1c',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  padding: '8px 16px',
                  fontWeight: 600
                }}
              >
                {loading ? 'Cancelling...' : 'Cancel Order & Release Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {showRefundModal && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '4px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#9a3412', marginBottom: '12px' }}>
              <RotateCcw size={22} />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                Initiate Refund — Order #{order.order_number}
              </h3>
            </div>

            <div style={{ background: '#fbfbfb', border: '1px solid #eeeeee', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#666' }}>Captured Settlement:</span>
                <strong>{money(totalAmount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <span>Refundable Amount:</span>
                <strong>{money(totalAmount)}</strong>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#444444', lineHeight: 1.5, margin: '0 0 16px' }}>
              This will update the order payment status to refunded, record the refund event in the platform ledger, and dispatch a refund notification to the customer. This action cannot be duplicated.
            </p>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px 12px', fontSize: '12px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleRefund} style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                disabled={loading}
                className="button button-outline"
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="button"
                style={{
                  background: '#9a3412',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '12px',
                  padding: '8px 16px',
                  fontWeight: 600
                }}
              >
                {loading ? 'Processing...' : `Confirm Refund (${money(totalAmount)})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
