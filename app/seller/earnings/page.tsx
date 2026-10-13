import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  CircleDollarSign,
  TrendingUp,
  Percent,
  Receipt,
  ShieldCheck,
  Info,
  Calendar,
  ArrowRight,
  ExternalLink
} from 'lucide-react'
import { getMySellerRecord, getSellerEarningsData } from '@/lib/sellers'
import { money } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function SellerEarningsPage() {
  const seller = await getMySellerRecord()
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const earningsData = await getSellerEarningsData()
  if (!earningsData) redirect('/seller/register')

  const { summary, items } = earningsData

  return (
    <main className="static-page-container seller-earnings-page" style={{ maxWidth: '1080px', paddingBottom: '96px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <span className="section-kicker">FINANCIAL SUMMARY & REVENUE</span>
        <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: 'clamp(22px, 4vw, 28px)' }}>
          Earnings & Commission
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
          Authoritative record of customer sales, platform commission deductions, and net vendor payouts.
        </p>
      </div>

      {/* Primary KPI Cards */}
      <div className="seller-earnings-highlight-grid" style={{ marginBottom: '28px' }}>
        <div className="seller-earnings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="seller-earnings-label">Gross Order Sales</span>
            <Receipt size={16} color="var(--muted)" />
          </div>
          <strong className="seller-earnings-value">{money(summary.grossSales)}</strong>
          <span className="seller-earnings-sub">Total customer order payments</span>
        </div>

        <div className="seller-earnings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="seller-earnings-label">Current Commission Rate</span>
            <Percent size={16} color="var(--muted)" />
          </div>
          <strong className="seller-earnings-value">{summary.currentCommissionRate}%</strong>
          <span className="seller-earnings-sub">Agreed SENO marketplace rate</span>
        </div>

        <div className="seller-earnings-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="seller-earnings-label">Commission Retained</span>
            <TrendingUp size={16} color="var(--muted)" />
          </div>
          <strong className="seller-earnings-value">{money(summary.totalCommission)}</strong>
          <span className="seller-earnings-sub">Platform service fee</span>
        </div>

        <div className="seller-earnings-card seller-earnings-card-net">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="seller-earnings-label">Net Vendor Earnings</span>
            <ShieldCheck size={16} color="#16a34a" />
          </div>
          <strong className="seller-earnings-value text-emerald">{money(summary.netEarnings)}</strong>
          <span className="seller-earnings-sub">Authoritative net payout total</span>
        </div>
      </div>

      {/* Policy Explanation Banner */}
      <section className="seller-policy-notice-card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <Info size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 6px', color: '#1e3a8a' }}>
              How Commission & Payouts Work at SENO
            </h2>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
              <li>
                <strong>Snapshotted per order:</strong> Commission is calculated and locked at the exact moment a customer completes checkout.
              </li>
              <li>
                <strong>Past orders are protected:</strong> If an administrator updates your commission rate, the new rate applies strictly to future customer orders. Completed and existing orders are never retroactively modified.
              </li>
              <li>
                <strong>Direct settlements:</strong> Payouts are reconciled and disbursed according to your agreed store payout details.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Orders Itemized Financial Ledger */}
      <section className="admin-table-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Itemized Payout Ledger</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Showing {items.length} confirmed order item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            No paid order records found yet. Customer purchases will appear here once verified.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="seller-desktop-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Customer Total</th>
                    <th>Rate</th>
                    <th>Commission Fee</th>
                    <th style={{ textAlign: 'right' }}>Net Vendor Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <Link
                          href={`/seller/orders/${item.id}`}
                          style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--ink)' }}
                        >
                          {item.orders?.order_number}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '12px' }}>
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{item.product_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Qty: {item.quantity}</div>
                      </td>
                      <td>
                        <strong>{money(Number(item.total_price))}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', background: 'var(--surface-subtle)', padding: '2px 6px', borderRadius: '2px' }}>
                          {item.commission_rate}%
                        </span>
                      </td>
                      <td style={{ color: '#b91c1c' }}>
                        -{money(Number(item.commission_amount))}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        {money(Number(item.seller_payout_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Ledger Cards */}
            <div className="seller-mobile-ledger-list">
              {items.map(item => (
                <div key={item.id} className="seller-ledger-card-mobile">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Link
                      href={`/seller/orders/${item.id}`}
                      style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--ink)', fontSize: '13px' }}
                    >
                      {item.orders?.order_number}
                    </Link>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                    {item.product_name} (x{item.quantity})
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    <span>Sale: {money(Number(item.total_price))}</span>
                    <span>Fee ({item.commission_rate}%): -{money(Number(item.commission_amount))}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' }}>
                      Net Payout:
                    </span>
                    <strong style={{ fontSize: '14px', color: '#16a34a' }}>
                      {money(Number(item.seller_payout_amount))}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
