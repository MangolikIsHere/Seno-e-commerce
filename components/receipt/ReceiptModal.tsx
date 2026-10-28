'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Printer, X, FileText, ExternalLink } from 'lucide-react'
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
  const [mounted, setMounted] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('receipt-modal-open')
    } else {
      document.body.classList.remove('receipt-modal-open')
    }
    return () => {
      document.body.classList.remove('receipt-modal-open')
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !order || !mounted || typeof document === 'undefined') return null

  const handlePrint = () => {
    if (isPrinting) return
    setIsPrinting(true)

    const receiptEl = document.getElementById('seno-printable-receipt')
    if (!receiptEl) {
      window.print()
      setIsPrinting(false)
      return
    }

    try {
      // 1. Create isolated hidden iframe to guarantee only the receipt is printed
      const iframe = document.createElement('iframe')
      iframe.setAttribute(
        'style',
        'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0;visibility:hidden;'
      )
      document.body.appendChild(iframe)

      const doc = iframe.contentWindow?.document
      if (!doc) {
        window.print()
        setIsPrinting(false)
        return
      }

      // 2. Set clean document title for the PDF export filename
      const cleanOrderNumber = String(order.order_number || order.id || 'order').replace(/[^a-zA-Z0-9-_]/g, '-')
      doc.title = `SENO-Receipt-${cleanOrderNumber}`

      // 3. Copy stylesheets & inline styles from main document
      const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      styleNodes.forEach(node => {
        try {
          doc.head.appendChild(node.cloneNode(true))
        } catch {
          // ignore
        }
      })

      // 4. Inject format-specific @page rules
      const printStyle = doc.createElement('style')
      if (format === 'compact') {
        printStyle.textContent = `
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111111 !important;
            width: 80mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .seno-receipt-document {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 8px 6px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        `
      } else {
        printStyle.textContent = `
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111111 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .seno-receipt-document {
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            padding: 24px 32px !important;
          }
          .no-print {
            display: none !important;
          }
        `
      }
      doc.head.appendChild(printStyle)

      // 5. Inject receipt markup
      doc.body.innerHTML = receiptEl.innerHTML

      // 6. Ensure all images are loaded before printing
      const images = Array.from(doc.images)
      const imagePromises = images.map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(resolve => {
          img.onload = resolve
          img.onerror = resolve
        })
      })

      Promise.all(imagePromises).then(() => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
          } catch (err) {
            console.error('Iframe print error, falling back to window.print():', err)
            window.print()
          } finally {
            setIsPrinting(false)
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe)
              }
            }, 1000)
          }
        }, 150)
      })
    } catch (err) {
      console.error('Print initialization error:', err)
      window.print()
      setIsPrinting(false)
    }
  }

  const directReceiptUrl = audience === 'admin'
    ? `/admin/orders/${order.id}/receipt`
    : `/account/orders/${order.id}/receipt`

  const modalContent = (
    <div
      className="receipt-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 15, 15, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
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
              disabled={isPrinting}
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
                cursor: isPrinting ? 'wait' : 'pointer',
                opacity: isPrinting ? 0.7 : 1
              }}
            >
              <Printer size={14} />
              <span>{isPrinting ? 'Preparing...' : 'Print / Save PDF'}</span>
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

  return createPortal(modalContent, document.body)
}
