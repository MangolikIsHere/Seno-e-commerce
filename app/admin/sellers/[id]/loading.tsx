import React from 'react'
import { Loader2 } from 'lucide-react'

export default function AdminSellerLoading() {
  return (
    <div className="admin-page-container">
      <div className="admin-top-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ width: '36px', height: '36px', background: 'var(--surface-subtle)', borderRadius: '4px' }} />
        <div>
          <div style={{ width: '120px', height: '12px', background: 'var(--surface-subtle)', marginBottom: '8px', borderRadius: '2px' }} />
          <div style={{ width: '220px', height: '24px', background: 'var(--surface-subtle)', borderRadius: '4px' }} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px', color: 'var(--muted)' }}>
        <Loader2 size={20} className="spin" />
        <span style={{ fontSize: '13px' }}>Loading partner dossier...</span>
      </div>
    </div>
  )
}
