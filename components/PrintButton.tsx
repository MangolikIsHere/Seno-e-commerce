'use client'

import React from 'react'
import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Print Packing Slips' }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="button button-ghost"
      style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '44px', marginLeft: 'auto' }}
    >
      <Printer size={14} />
      <span>{label}</span>
    </button>
  )
}
