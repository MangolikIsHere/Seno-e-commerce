'use client'

import React from 'react'
import { Printer } from 'lucide-react'

export function PrintTriggerClientButton({ label = 'Print Document' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="button button-primary"
      style={{
        fontSize: '12px',
        padding: '8px 18px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer'
      }}
    >
      <Printer size={14} />
      <span>{label}</span>
    </button>
  )
}
