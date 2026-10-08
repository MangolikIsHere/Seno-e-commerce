import React from 'react'
import type { Metadata } from 'next'
import { getAdminStoreSettings } from '@/lib/admin'
import { Settings, ShieldCheck, Mail, Globe, Percent, Truck, Check } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Platform Settings — SENO Admin',
  robots: {
    index: false,
    follow: false
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getAdminStoreSettings()

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">CONFIGURATION</span>
          <h1 className="admin-page-title">Platform Settings</h1>
          <p className="admin-page-subtitle">
            Configure global brand parameters, default seller commissions, and customer shipping thresholds.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '840px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Brand Information Card */}
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h2 className="admin-card-heading" style={{ marginBottom: '4px' }}>Store & Identity</h2>
          <p className="admin-card-subheading" style={{ marginBottom: '20px' }}>Global storefront brand parameters</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Storefront Brand Name
              </label>
              <input
                type="text"
                defaultValue={settings?.store_name || 'SENO'}
                readOnly
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)', color: 'var(--ink)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Operating Currency
              </label>
              <input
                type="text"
                defaultValue="INR (₹) — Indian Rupee"
                readOnly
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)', color: 'var(--ink)' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
              Official Concierge Support Email
            </label>
            <input
              type="text"
              defaultValue="officialsenostore@gmail.com"
              readOnly
              style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)', color: 'var(--ink)' }}
            />
          </div>
        </div>

        {/* Marketplace Commercials Card */}
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h2 className="admin-card-heading" style={{ marginBottom: '4px' }}>Marketplace Commercials</h2>
          <p className="admin-card-subheading" style={{ marginBottom: '20px' }}>Default reseller splits and shipping rules</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Default Reseller Commission
              </label>
              <input
                type="text"
                defaultValue="15.00%"
                readOnly
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)', color: 'var(--ink)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Can be customized per-seller in the Sellers portal.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Complimentary Shipping Threshold
              </label>
              <input
                type="text"
                defaultValue="₹1,500.00"
                readOnly
                style={{ width: '100%', padding: '10px 14px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', background: 'var(--surface-subtle)', color: 'var(--ink)' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                Orders meeting or exceeding this qualify for complimentary express delivery.
              </span>
            </div>
          </div>
        </div>

        {/* Security & Access Card */}
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h2 className="admin-card-heading" style={{ marginBottom: '4px' }}>System Security & Role Verification</h2>
          <p className="admin-card-subheading" style={{ marginBottom: '16px' }}>Strict server-side policy enforcement</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} color="#15803d" />
              <span>Cryptographic Row Level Security (RLS) active on all tables</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} color="#15803d" />
              <span>Multi-vendor inventory isolation enforced at database trigger layer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={16} color="#15803d" />
              <span>Server-authoritative cart discount calculation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
