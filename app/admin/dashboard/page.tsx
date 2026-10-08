import React from 'react'
import Link from 'next/link'
import { getAdminOverviewStats } from '@/lib/admin'
import {
  TrendingUp,
  ShoppingBag,
  Store,
  Package,
  ArrowRight,
  AlertCircle,
  Tag,
  Plus,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'
import { money } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const stats = await getAdminOverviewStats()

  const pendingAttentionCount = stats.pendingOrdersCount + stats.pendingSellersCount + stats.pendingProductsCount

  return (
    <div className="admin-page-container">
      {/* Top Bar / Greeting */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">CONTROL PLANE</span>
          <h1 className="admin-page-title">Good Morning, Admin</h1>
          <p className="admin-page-subtitle">
            Live overview of SENO marketplace performance, orders, seller ecosystem, and operations.
          </p>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin/promotions" className="button button-outline" style={{ fontSize: '12px', padding: '9px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Tag size={14} />
            <span>Offers</span>
          </Link>
          <Link href="/admin/products/new" className="button button-primary" style={{ fontSize: '12px', padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} />
            <span>New Product</span>
          </Link>
        </div>
      </div>

      {/* Actionable Priorities: NEEDS ATTENTION */}
      {pendingAttentionCount > 0 && (
        <div className="admin-attention-card">
          <div className="admin-attention-header">
            <div className="admin-attention-icon-wrap">
              <AlertCircle size={18} color="var(--ink)" />
            </div>
            <div>
              <h2 className="admin-attention-title">Action Required Today</h2>
              <p className="admin-attention-subtitle">Items requiring operational review or fulfillment action</p>
            </div>
          </div>
          <div className="admin-attention-pills">
            {stats.pendingOrdersCount > 0 && (
              <Link href="/admin/orders" className="admin-attention-pill">
                <span className="admin-attention-pill-count">{stats.pendingOrdersCount}</span>
                <span>orders pending settlement / processing</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {stats.pendingSellersCount > 0 && (
              <Link href="/admin/sellers" className="admin-attention-pill">
                <span className="admin-attention-pill-count">{stats.pendingSellersCount}</span>
                <span>seller application{stats.pendingSellersCount > 1 ? 's' : ''} awaiting review</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {stats.pendingProductsCount > 0 && (
              <Link href="/admin/products?status=submitted" className="admin-attention-pill">
                <span className="admin-attention-pill-count">{stats.pendingProductsCount}</span>
                <span>product{stats.pendingProductsCount > 1 ? 's' : ''} awaiting curation approval</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="kpi-grid">
        {/* Total Settled Revenue */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Settled Gross Volume</span>
              <TrendingUp size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{money(stats.totalRevenue)}</div>
          </div>
          <div className="kpi-meta">
            From {stats.paidOrdersCount} verified paid order{stats.paidOrdersCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Orders Count */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Platform Orders</span>
              <ShoppingBag size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{stats.totalOrdersCount}</div>
          </div>
          <div className="kpi-meta">
            {stats.paidOrdersCount} completed · {stats.pendingOrdersCount} pending
          </div>
        </div>

        {/* Sellers */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Seller Ecosystem</span>
              <Store size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{stats.approvedSellersCount}</div>
          </div>
          <div className="kpi-meta">
            {stats.totalSellersCount} registered · {stats.pendingSellersCount} pending review
          </div>
        </div>

        {/* Catalog */}
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Curated Catalog</span>
              <Package size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{stats.approvedProductsCount}</div>
          </div>
          <div className="kpi-meta">
            {stats.totalProductsCount} total pieces · {stats.pendingProductsCount} in review
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Orders & Recent Sellers */}
      <div className="admin-grid-two-col">
        {/* Recent Orders Section */}
        <div className="admin-table-card">
          <div className="admin-table-header-row">
            <div>
              <h2 className="admin-card-heading">Recent Orders</h2>
              <p className="admin-card-subheading">Authoritative customer transactions</p>
            </div>
            <Link href="/admin/orders" className="admin-view-all-link">
              <span>All Orders</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <div className="admin-empty-card-inner">
              <ShoppingBag size={32} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No orders placed yet</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Incoming customer purchases will appear here in real-time.</p>
            </div>
          ) : (
            <>
              {/* Desktop View: Clean Table */}
              <div className="admin-desktop-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Payment</th>
                      <th>Fulfillment</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.map((order: any) => {
                      const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric'
                      })
                      return (
                        <tr key={order.id}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{order.order_number}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{orderDate}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{order.profiles?.full_name || 'Guest'}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{order.profiles?.email || '—'}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{money(Number(order.total_amount || 0))}</td>
                          <td>
                            <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                              {order.payment_status}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${order.status === 'delivered' ? 'delivered' : order.status === 'shipped' ? 'shipped' : order.status === 'cancelled' ? 'cancelled' : 'processing'}`}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link href={`/admin/orders/${order.id}`} className="button button-outline" style={{ fontSize: '11px', padding: '5px 12px' }}>
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Stacked Order Cards (No forced horizontal scrolling) */}
              <div className="admin-mobile-card-list">
                {stats.recentOrders.map((order: any) => {
                  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                  return (
                    <div key={order.id} className="admin-order-card-mobile">
                      <div className="admin-order-card-header">
                        <div>
                          <span className="admin-order-number">#{order.order_number}</span>
                          <span className="admin-order-date">{orderDate}</span>
                        </div>
                        <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                          {order.payment_status}
                        </span>
                      </div>
                      <div className="admin-order-card-body">
                        <div className="admin-order-customer">
                          <span style={{ fontWeight: 500 }}>{order.profiles?.full_name || 'Guest Checkout'}</span>
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{order.profiles?.email || '—'}</span>
                        </div>
                        <div className="admin-order-total-block">
                          <span className="admin-order-amount">{money(Number(order.total_amount || 0))}</span>
                          <span className={`status-pill ${order.status === 'delivered' ? 'delivered' : order.status === 'shipped' ? 'shipped' : 'processing'}`} style={{ fontSize: '10px' }}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      <div className="admin-order-card-footer">
                        <Link href={`/admin/orders/${order.id}`} className="button button-outline" style={{ width: '100%', textAlign: 'center', fontSize: '12px', padding: '10px 0' }}>
                          View Order Details
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Seller Activity & Quick Platform Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Seller Activity Card */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <div>
                <h2 className="admin-card-heading">Seller Ecosystem</h2>
                <p className="admin-card-subheading">Registered brand partners</p>
              </div>
              <Link href="/admin/sellers" className="admin-view-all-link">
                <span>All Sellers</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {stats.recentSellers.length === 0 ? (
              <div className="admin-empty-card-inner">
                <Store size={32} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No sellers registered</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Independent partner applications will appear here.</p>
              </div>
            ) : (
              <div className="admin-seller-quick-list">
                {stats.recentSellers.slice(0, 4).map((seller: any) => (
                  <div key={seller.id} className="admin-seller-row-item">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)' }}>{seller.store_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        /{seller.slug} · {seller.commission_rate != null ? `${seller.commission_rate}% commission` : '15% default'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`status-pill ${seller.seller_status === 'approved' ? 'approved' : seller.seller_status === 'suspended' ? 'suspended' : 'pending'}`}>
                        {seller.seller_status}
                      </span>
                      <Link href={`/admin/sellers`} className="button button-ghost" style={{ padding: '6px 10px', fontSize: '11px' }}>
                        Review
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Platform Governance Shortcuts */}
          <div className="admin-governance-card">
            <h3 style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 16px', fontWeight: 600 }}>
              Operational Quick Links
            </h3>
            <div className="admin-quick-links-grid">
              <Link href="/admin/promotions" className="admin-quick-link-tile">
                <Tag size={18} color="var(--ink)" />
                <div>
                  <span className="admin-quick-link-title">Promotions & Offers</span>
                  <span className="admin-quick-link-desc">Manage seasonal discounts & campaign hero</span>
                </div>
              </Link>
              <Link href="/admin/products" className="admin-quick-link-tile">
                <Package size={18} color="var(--ink)" />
                <div>
                  <span className="admin-quick-link-title">Catalog Inventory</span>
                  <span className="admin-quick-link-desc">Curation approvals and live stock toggles</span>
                </div>
              </Link>
              <Link href="/admin/customers" className="admin-quick-link-tile">
                <ShieldCheck size={18} color="var(--ink)" />
                <div>
                  <span className="admin-quick-link-title">Client Directory</span>
                  <span className="admin-quick-link-desc">Customer profiles and lifetime purchase values</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
