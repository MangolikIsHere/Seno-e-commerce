'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Printer, X, FileText, CheckCircle2, ExternalLink } from 'lucide-react'
import { PrintableReceipt } from './PrintableReceipt'

export interface ReceiptModalProps {
  order: any
  isOpen: boolean
  onClose: () => void
  audience?: 'admin' | 'customer'
}

export function ReceiptModal({
  order,
  isOpen,
  onClose,
  audience = 'customer'
}: ReceiptModalProps) {
  const [format, setFormat] = useState<'a4' | 'compact'>('a4')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !order) return null

  const handlePrint = () => {
    // Open system print dialog; our @media print CSS strictly targets #seno-printable-receipt
    window.print()
  }

  const directReceiptUrl = audience === 'admin'
    ? `/admin/orders/${order.id}/receipt`
    : `/account/orders/${order.id}/receipt`

  return (
    <div
      className="receipt-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 15, 15, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="receipt-modal-card no-print-modal-container"
        style={{
          background: '#ffffff',
          borderRadius: '4px',
          width: '100%',
          maxWidth: format === 'a4' ? '900px' : '440px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          transition: 'max-width 0.2s ease'
        }}
      >
        {/* Modal Header Bar (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #e5e5e5',
            background: '#fafafa',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#111" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111' }}>
                Printable Receipt — #{order.order_number}
              </h3>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#666' }}>
              Official store invoice · Ready for A4 paper and PDF export
            </p>
          </div>

          {/* Format Selector & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                background: '#eeeeee',
                borderRadius: '3px',
                padding: '2px',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <button
                type="button"
                onClick={() => setFormat('a4')}
                style={{
                  border: 'none',
                  background: format === 'a4' ? '#ffffff' : 'transparent',
                  color: format === 'a4' ? '#111' : '#666',
                  padding: '5px 10px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: format === 'a4' ? 700 : 500,
                  boxShadow: format === 'a4' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                A4 Document
              </button>
              <button
                type="button"
                onClick={() => setFormat('compact')}
                style={{
                  border: 'none',
                  background: format === 'compact' ? '#ffffff' : 'transparent',
                  color: format === 'compact' ? '#111' : '#666',
                  padding: '5px 10px',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: format === 'compact' ? 700 : 500,
                  boxShadow: format === 'compact' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                Compact (80mm)
              </button>
            </div>

            <Link
              href={directReceiptUrl}
              target="_blank"
              title="Open full-page receipt in separate tab"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: '#555',
                textDecoration: 'none',
                padding: '6px 10px',
                borderRadius: '3px',
                border: '1px solid #d5d5d5',
                background: '#fff'
              }}
            >
              <ExternalLink size={13} />
              <span>Full Page</span>
            </Link>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#ffffff',
                background: '#111111',
                border: 'none',
                padding: '7px 16px',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close receipt modal"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#666',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview (This container holds the printable component) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: '#e9ecef'
          }}
        >
          {/* Printable Receipt DOM with exact ID targeted by print CSS */}
          <div id="seno-printable-receipt" style={{ background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <PrintableReceipt
              order={order}
              format={format}
              audience={audience}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
