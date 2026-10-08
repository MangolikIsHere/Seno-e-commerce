import React from 'react'
import type { Metadata } from 'next'
import { getAdminPaymentsData } from '@/lib/admin'
import { money } from '@/lib/catalog'
import { CreditCard, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Payments & Settlements — SENO Admin',
  robots: {
    index: false,
    follow: false
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminPaymentsPage() {
  const transactions = await getAdminPaymentsData()

  const paidTransactions = transactions.filter((t: any) => t.payment_status === 'paid')
  const totalSettled = paidTransactions.reduce((acc: number, t: any) => acc + Number(t.total_amount || 0), 0)
  const failedTransactions = transactions.filter((t: any) => t.payment_status === 'failed').length
  const unpaidTransactions = transactions.filter((t: any) => t.payment_status === 'unpaid').length

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">FINANCIAL RECONCILIATION</span>
          <h1 className="admin-page-title">Payments & Settlements</h1>
          <p className="admin-page-subtitle">
            Authoritative gateway settlements, payment IDs, gross captured revenue, and refund audit trail.
          </p>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Gross Settled Volume</span>
              <CreditCard size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{money(totalSettled)}</div>
          </div>
          <div className="kpi-meta">Captured through Razorpay gateway</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Settled Orders</span>
              <CheckCircle2 size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{paidTransactions.length}</div>
          </div>
          <div className="kpi-meta">Successful checkouts</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Unpaid Reservations</span>
              <AlertTriangle size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{unpaidTransactions}</div>
          </div>
          <div className="kpi-meta">Awaiting settlement or expired</div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <h2 className="admin-card-heading">Gateway Transaction Log ({transactions.length})</h2>
            <p className="admin-card-subheading">Cryptographic settlement records</p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="admin-empty-card-inner">
            <CreditCard size={36} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No transaction records yet</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Completed checkouts will appear here with Razorpay reference IDs.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="admin-desktop-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Gateway Payment ID</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t: any) => {
                    const dateFormatted = new Date(t.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                    return (
                      <tr key={t.id}>
                        <td>
                          <Link href={`/admin/orders/${t.id}`} style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}>
                            #{t.order_number}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{t.profiles?.full_name || 'Guest'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{t.profiles?.email || '—'}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--ink)' }}>
                            {t.razorpay_payment_id || t.razorpay_order_id || 'Direct Settlement'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12.5px', textTransform: 'capitalize' }}>
                            {t.payment_method || 'Online'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {money(Number(t.total_amount || 0))}
                        </td>
                        <td>
                          <span className={`status-pill ${t.payment_status === 'paid' ? 'paid' : t.payment_status === 'failed' ? 'rejected' : 'pending'}`}>
                            {t.payment_status?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--muted)' }}>
                          {dateFormatted}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="admin-mobile-card-list">
              {transactions.map((t: any) => (
                <div key={t.id} className="admin-order-card-mobile">
                  <div className="admin-order-card-header">
                    <div>
                      <span className="admin-order-number">#{t.order_number}</span>
                      <span className="admin-order-date">{new Date(t.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <span className={`status-pill ${t.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                      {t.payment_status?.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ padding: '0 16px 12px', fontSize: '12px', color: 'var(--muted)' }}>
                    <div>Customer: <strong style={{ color: 'var(--ink)' }}>{t.profiles?.full_name || 'Guest'}</strong></div>
                    <div style={{ marginTop: '2px', wordBreak: 'break-all' }}>Ref: <span style={{ fontFamily: 'monospace' }}>{t.razorpay_payment_id || 'Direct'}</span></div>
                  </div>

                  <div className="admin-order-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>{money(Number(t.total_amount || 0))}</span>
                    <Link href={`/admin/orders/${t.id}`} className="button button-outline" style={{ fontSize: '11px', padding: '6px 14px' }}>
                      View Order
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
