import React from 'react'
import type { Metadata } from 'next'
import { getPendingSellers } from '@/lib/admin'
import { SellerStatusForm } from './SellerStatusForm'
import { Store, CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sellers Ecosystem — SENO Admin',
  robots: {
    index: false,
    follow: false
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminSellersPage() {
  const sellers = await getPendingSellers()

  const pendingCount = sellers.filter((s: any) => s.seller_status === 'pending').length
  const approvedCount = sellers.filter((s: any) => s.seller_status === 'approved').length

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">PARTNER ECOSYSTEM</span>
          <h1 className="admin-page-title">Marketplace Sellers</h1>
          <p className="admin-page-subtitle">
            Manage partner brand onboarding, reseller proposals, commission splits, and shop status.
          </p>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Total Sellers</span>
              <Store size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{sellers.length}</div>
          </div>
          <div className="kpi-meta">Registered marketplace partners</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Pending Review</span>
              <Clock size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{pendingCount}</div>
          </div>
          <div className="kpi-meta">Awaiting approval or commission</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Active Partners</span>
              <CheckCircle size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{approvedCount}</div>
          </div>
          <div className="kpi-meta">Authorized to sell on SENO</div>
        </div>
      </div>

      {/* Sellers List Card */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <h2 className="admin-card-heading">Partner Directory ({sellers.length})</h2>
            <p className="admin-card-subheading">All independent brand and reseller accounts</p>
          </div>
        </div>

        {sellers.length === 0 ? (
          <div className="admin-empty-card-inner">
            <AlertCircle size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No sellers registered yet</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>When partner brands apply, their profiles will appear here.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="admin-desktop-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Store / Brand</th>
                    <th>Contact Details</th>
                    <th>Status</th>
                    <th>Commission</th>
                    <th style={{ textAlign: 'right' }}>Update Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((seller: any) => (
                    <tr key={seller.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{seller.store_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>slug: /{seller.slug}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{seller.contact_email || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{seller.contact_phone || 'No phone'}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${seller.seller_status === 'approved' ? 'approved' : seller.seller_status === 'rejected' ? 'rejected' : seller.seller_status === 'suspended' ? 'suspended' : 'pending'}`}>
                          {seller.seller_status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {seller.commission_rate != null ? `${seller.commission_rate}%` : '15% default'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <Link
                            href={`/admin/sellers/${seller.id}`}
                            className="button button-outline"
                            style={{ fontSize: '11px', padding: '5px 12px' }}
                          >
                            Review
                          </Link>
                          <SellerStatusForm
                            sellerId={seller.id}
                            currentStatus={seller.seller_status}
                            currentCommission={seller.commission_rate}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="admin-mobile-card-list">
              {sellers.map((seller: any) => (
                <div key={seller.id} className="admin-order-card-mobile">
                  <div className="admin-order-card-header">
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{seller.store_name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>/{seller.slug}</span>
                    </div>
                    <span className={`status-pill ${seller.seller_status === 'approved' ? 'approved' : seller.seller_status === 'suspended' ? 'suspended' : 'pending'}`}>
                      {seller.seller_status}
                    </span>
                  </div>

                  <div style={{ padding: '0 16px 14px', fontSize: '12.5px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Email: <strong style={{ color: 'var(--ink)' }}>{seller.contact_email || '—'}</strong></div>
                    <div>Phone: <strong style={{ color: 'var(--ink)' }}>{seller.contact_phone || '—'}</strong></div>
                    <div>Commission: <strong style={{ color: 'var(--ink)' }}>{seller.commission_rate != null ? `${seller.commission_rate}%` : '15% default'}</strong></div>
                  </div>

                  <div className="admin-order-card-footer">
                    <Link
                      href={`/admin/sellers/${seller.id}`}
                      className="button button-outline"
                      style={{ width: '100%', fontSize: '12px', padding: '10px 0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <span>Review Seller Dossier</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
