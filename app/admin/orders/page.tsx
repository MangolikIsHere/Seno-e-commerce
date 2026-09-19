import { getPlatformOrders } from '@/lib/admin'
import { money } from '@/lib/catalog'
import Link from 'next/link'
import { ShoppingBag, CreditCard, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const orders = await getPlatformOrders()

  const paidOrders = orders.filter((o: any) => o.payment_status === 'paid')
  const totalGross = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
  const pendingOrders = orders.filter((o: any) => o.payment_status === 'unpaid' || o.status === 'pending')

  return (
    <div>
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <h1 className="admin-page-title">Platform Orders</h1>
          <p className="admin-page-subtitle">
            Authoritative marketplace ledger, customer checkouts, settlement status, and fulfillment tracking
          </p>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>All Orders</span>
            <ShoppingBag size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{orders.length}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Settled Volume</span>
            <CreditCard size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{money(totalGross)}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Paid Orders</span>
            <CheckCircle2 size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{paidOrders.length}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Pending / Incomplete</span>
            <Clock size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{pendingOrders.length}</div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Order History & Invoices</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>All customer transactions recorded in the system</div>
          </div>
        </div>

        {orders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <AlertCircle size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>No orders placed on the platform yet.</p>
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="admin-table responsive-card-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Items & Seller</th>
                  <th>Payment Status</th>
                  <th>Lifecycle / Fulfillment</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })

                  return (
                    <tr key={order.id}>
                      <td data-label="Order #">
                        <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{order.order_number}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>ID: {order.id.slice(0, 8)}...</div>
                        </Link>
                      </td>
                      <td data-label="Date">
                        <div style={{ fontSize: '13px' }}>{orderDate}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td data-label="Customer">
                        <div style={{ fontWeight: 500, fontSize: '13px' }}>{order.profiles?.full_name || 'Guest Checkout'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{order.profiles?.email || '—'}</div>
                      </td>
                      <td data-label="Items & Seller">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(order.order_items || []).map((item: any) => (
                            <div key={item.id} style={{ fontSize: '12px' }}>
                              <span style={{ fontWeight: 500 }}>{item.product_name}</span>{' '}
                              <span style={{ color: 'var(--muted)' }}>(x{item.quantity})</span>
                              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                                Seller: <strong style={{ color: 'var(--ink)' }}>{item.sellers?.store_name || 'Platform (SENO)'}</strong>
                                {' · '}
                                <span style={{ textTransform: 'capitalize' }}>{item.fulfillment_status || 'unfulfilled'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td data-label="Payment Status">
                        <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : order.payment_status === 'failed' ? 'suspended' : 'pending'}`}>
                          {order.payment_status?.toUpperCase() || 'UNPAID'}
                        </span>
                      </td>
                      <td data-label="Lifecycle">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span className={`status-pill ${order.status === 'delivered' ? 'delivered' : order.status === 'shipped' ? 'shipped' : order.status === 'cancelled' ? 'cancelled' : order.status === 'confirmed' ? 'approved' : 'pending'}`} style={{ alignSelf: 'flex-start' }}>
                            {order.status}
                          </span>
                        </div>
                      </td>
                      <td data-label="Total" style={{ textAlign: 'right', fontWeight: 600 }}>
                        {money(Number(order.total_amount))}
                      </td>
                      <td data-label="Action" style={{ textAlign: 'right' }}>
                        <Link href={`/admin/orders/${order.id}`} className="button button-outline" style={{ fontSize: '11px', padding: '6px 12px', whiteSpace: 'nowrap' }}>
                          View Details
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

