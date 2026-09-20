import React from 'react'
import Link from 'next/link'
import { getAdminOverviewStats } from '@/lib/admin'
import { 
  TrendingUp, 
  ShoppingBag, 
  Store, 
  Package, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const stats = await getAdminOverviewStats()

  const formattedRevenue = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(stats.totalRevenue)

  const pendingAttentionCount = stats.pendingSellersCount + stats.pendingProductsCount

  return (
    <div>
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <h1 className="admin-page-title">Marketplace Overview</h1>
          <p className="admin-page-subtitle">
            Authoritative platform performance, seller ecosystem, and catalog governance
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <Link href="/admin/products?status=submitted" className="button button-outline" style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '4px' }}>
            Review Products
          </Link>
          <Link href="/admin/sellers" className="button button-primary" style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '4px' }}>
            Manage Sellers
          </Link>
        </div>
      </div>

      {/* Action Required Banner if pending items */}
      {pendingAttentionCount > 0 && (
        <div style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          borderLeft: '4px solid var(--ink)',
          padding: '16px 20px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '2px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={18} color="var(--ink)" />
            <div style={{ fontSize: '13px' }}>
              <span style={{ fontWeight: 600 }}>Action Required: </span>
              {stats.pendingSellersCount > 0 && (
                <span>{stats.pendingSellersCount} seller application{stats.pendingSellersCount > 1 ? 's' : ''} awaiting review. </span>
              )}
              {stats.pendingProductsCount > 0 && (
                <span>{stats.pendingProductsCount} product listing{stats.pendingProductsCount > 1 ? 's' : ''} submitted for curation approval.</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {stats.pendingSellersCount > 0 && (
              <Link href="/admin/sellers" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline' }}>
                Review Sellers
              </Link>
            )}
            {stats.pendingProductsCount > 0 && (
              <Link href="/admin/products?status=submitted" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline', marginLeft: '12px' }}>
                Review Products
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="kpi-grid">
        {/* Total Settled Revenue */}
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Settled Gross Volume</span>
            <TrendingUp size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{formattedRevenue}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            From {stats.paidOrdersCount} verified paid order{stats.paidOrdersCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Orders Count */}
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Total Platform Orders</span>
            <ShoppingBag size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{stats.totalOrdersCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            {stats.pendingOrdersCount} pending / awaiting settlement
          </div>
        </div>

        {/* Sellers */}
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Seller Ecosystem</span>
            <Store size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{stats.approvedSellersCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            {stats.pendingSellersCount} pending application{stats.pendingSellersCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Catalog */}
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Catalog Products</span>
            <Package size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{stats.approvedProductsCount}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            {stats.pendingProductsCount} listing{stats.pendingProductsCount !== 1 ? 's' : ''} pending review
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Recent Sellers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        {/* Recent Orders */}
        <div className="admin-table-card">
          <div className="admin-table-header-row">
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Recent Orders</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Real-time marketplace customer orders</div>
            </div>
            <Link href="/admin/orders" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', fontWeight: 500 }}>
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      No orders placed on the platform yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((order: any) => {
                    const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric'
                    })
                    const totalFormatted = new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0
                    }).format(order.total_amount || 0)

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
                        <td style={{ fontWeight: 600 }}>{totalFormatted}</td>
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
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Seller Ecosystem */}
        <div className="admin-table-card">
          <div className="admin-table-header-row">
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Seller Activity</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Brands & resellers on SENO</div>
            </div>
            <Link href="/admin/sellers" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'none', fontWeight: 500 }}>
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Store / Brand</th>
                  <th>Type</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSellers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                      No sellers registered yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentSellers.map((seller: any) => {
                    return (
                      <tr key={seller.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{seller.store_name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{seller.contact_email || seller.slug}</div>
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '11px', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px',
                            fontWeight: 600,
                            color: seller.seller_type === 'platform' ? 'var(--ink)' : 'var(--muted)' 
                          }}>
                            {seller.seller_type}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {seller.commission_rate != null ? `${seller.commission_rate}%` : 'Default (15%)'}
                        </td>
                        <td>
                          <span className={`status-pill ${seller.seller_status === 'approved' ? 'approved' : seller.seller_status === 'suspended' ? 'suspended' : 'pending'}`}>
                            {seller.seller_status}
                          </span>
                        </td>
                        <td>
                          <Link 
                            href="/admin/sellers" 
                            style={{ 
                              fontSize: '12px', 
                              color: 'var(--ink)', 
                              textDecoration: 'underline',
                              fontWeight: 500
                            }}
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

