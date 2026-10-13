import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Store,
  Mail,
  Phone,
  Percent,
  ShieldCheck,
  Building,
  CreditCard,
  ExternalLink,
  User,
  Info
} from 'lucide-react'
import { getMySellerRecord } from '@/lib/sellers'

export const dynamic = 'force-dynamic'

export default async function SellerSettingsPage() {
  const seller = await getMySellerRecord()
  if (!seller) {
    redirect('/seller/register')
  }

  const isApproved = seller.seller_status === 'approved'

  return (
    <main className="static-page-container seller-settings-page" style={{ maxWidth: '960px', paddingBottom: '96px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <span className="section-kicker">PARTNER PROFILE & PREFERENCES</span>
        <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: 'clamp(22px, 4vw, 28px)' }}>
          Account & Store Settings
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
          Review your authorized store profile, contact information, and platform partnership terms.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        {/* Store Profile Card */}
        <section className="admin-table-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Store Identity</h2>
            <span className={`seller-status-chip ${isApproved ? 'chip-approved' : 'chip-pending'}`}>
              <ShieldCheck size={12} />
              <span style={{ textTransform: 'capitalize' }}>{seller.seller_status.replace(/_/g, ' ')}</span>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Store Name
              </span>
              <strong>{seller.store_name}</strong>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Store URL Handle
              </span>
              <span style={{ fontFamily: 'monospace' }}>/{seller.slug}</span>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Contact Email
              </span>
              <span>{seller.contact_email || 'Not specified'}</span>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Contact Phone
              </span>
              <span>{seller.contact_phone || 'Not specified'}</span>
            </div>
          </div>

          {seller.description && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontSize: '13px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                Store Bio
              </span>
              <p style={{ margin: 0, color: 'var(--ink)', lineHeight: 1.5 }}>{seller.description}</p>
            </div>
          )}
        </section>

        {/* Partnership & Commission Card */}
        <section className="admin-table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px' }}>Commercial Terms</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Agreed Commission Rate
              </span>
              <strong style={{ fontSize: '16px', color: '#16a34a' }}>{seller.commission_rate}%</strong>
              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                Applicable to new order lines
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Account Classification
              </span>
              <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{seller.seller_type} Partner</span>
            </div>

            <div>
              <span style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                Onboarded Date
              </span>
              <span>
                {new Date(seller.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '18px', padding: '12px 14px', background: 'var(--surface-subtle)', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '12px', color: '#475569', display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Info size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
            <span>
              Commission rates are managed authoritatively by SENO marketplace administrators. If you wish to propose a rate change, please contact partner support.
            </span>
          </div>
        </section>

        {/* Account Profile Link */}
        <section className="admin-table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>Security & Login Credentials</h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 16px' }}>
            To update your primary email address, login password, or customer shipping addresses, visit your account security settings.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/account" className="button button-outline" style={{ fontSize: '12px' }}>
              <User size={14} />
              <span>Manage User Account</span>
            </Link>
            <Link href="/account/update-password" className="button button-outline" style={{ fontSize: '12px' }}>
              <span>Change Password</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
