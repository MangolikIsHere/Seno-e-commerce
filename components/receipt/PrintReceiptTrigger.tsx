'use client'

import React, { useState } from 'react'
import { Printer } from 'lucide-react'
import { ReceiptModal } from './ReceiptModal'

export interface PrintReceiptTriggerProps {
  order: any
  label?: string
  audience?: 'admin' | 'customer'
  className?: string
  style?: React.CSSProperties
}

export function PrintReceiptTrigger({
  order,
  label = 'Print Receipt',
  audience = 'customer',
  className = 'button button-ghost',
  style
}: PrintReceiptTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className}
        style={{
          fontSize: '12px',
          padding: '6px 14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          minHeight: '38px',
          cursor: 'pointer',
          ...style
        }}
      >
        <Printer size={14} />
        <span>{label}</span>
      </button>

      {isOpen && (
        <ReceiptModal
          order={order}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          audience={audience}
        />
      )}
    </>
  )
}
