'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  ChevronRight,
  ArrowRight
} from 'lucide-react'
import { money } from '@/lib/catalog'
import { PrintReceiptTrigger } from '@/components/receipt/PrintReceiptTrigger'

interface AdminOrdersClientProps {
  initialOrders: any[]
}

export function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Filter calculations
  const filteredOrders = useMemo(() => {
    return initialOrders.filter(order => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchNumber = order.order_number?.toLowerCase().includes(q)
        const matchCustomer = order.profiles?.full_name?.toLowerCase().includes(q)
        const matchEmail = order.profiles?.email?.toLowerCase().includes(q)
        const matchId = order.id?.toLowerCase().includes(q)
        if (!matchNumber && !matchCustomer && !matchEmail && !matchId) return false
      }

      // Payment filter
      if (paymentFilter !== 'all') {
        if (order.payment_status !== paymentFilter) return false
      }

      // Lifecycle status filter
      if (statusFilter !== 'all') {
        if (order.status !== statusFilter) return false
      }

      return true
    })
  }, [initialOrders, searchQuery, paymentFilter, statusFilter])

  // Summary Metrics
  const paidOrders = initialOrders.filter((o: any) => o.payment_status === 'paid')
  const totalSettledGross = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
  const pendingCount = initialOrders.filter((o: any) => o.payment_status === 'unpaid' || o.status === 'pending').length

  const hasActiveFilters = searchQuery !== '' || paymentFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setPaymentFilter('all')
    setStatusFilter('all')
  }

  return (
    <div>
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">LEDGER & FULFILLMENT</span>
          <h1 className="admin-page-title">Platform Orders</h1>
          <p className="admin-page-subtitle">
            Authoritative marketplace ledger, customer checkouts, settlement status, and fulfillment tracking.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>All Transactions</span>
              <ShoppingBag size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{initialOrders.length}</div>
          </div>
          <div className="kpi-meta">Recorded platform orders</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Settled Gross Volume</span>
              <CreditCard size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{money(totalSettledGross)}</div>
          </div>
          <div className="kpi-meta">Across {paidOrders.length} verified paid orders</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Paid & Confirmed</span>
              <CheckCircle2 size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{paidOrders.length}</div>
          </div>
          <div className="kpi-meta">Payment gateway captured</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Pending Attention</span>
              <Clock size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{pendingCount}</div>
          </div>
          <div className="kpi-meta">Unpaid or awaiting fulfillment</div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="admin-table-card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search 
              size={16} 
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} 
            />
            <input
              type="text"
              placeholder="Search by Order # (e.g. SENO-1001), customer name, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="admin-search-input"
              style={{
                width: '100%',
                padding: '11px 16px 11px 40px',
                fontSize: '13px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                background: '#fff',
                color: 'var(--ink)'
              }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Chips Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginRight: '4px' }}>
              Payment:
            </span>
            {['all', 'paid', 'unpaid', 'failed'].map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setPaymentFilter(status)}
                className={`admin-filter-chip ${paymentFilter === status ? 'active' : ''}`}
              >
                {status.toUpperCase()}
              </button>
            ))}

            <div style={{ width: '1px', height: '16px', background: 'var(--border)', margin: '0 4px' }} />

            <span style={{ fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginRight: '4px' }}>
              Fulfillment:
            </span>
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`admin-filter-chip ${statusFilter === status ? 'active' : ''}`}
              >
                {status.toUpperCase()}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="admin-clear-filter-btn"
                style={{ marginLeft: 'auto', fontSize: '11px', color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Orders List / Table Card */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <h2 className="admin-card-heading">
              Orders Ledger ({filteredOrders.length})
            </h2>
            <p className="admin-card-subheading">
              {hasActiveFilters ? 'Showing filtered results' : 'All customer transactions recorded in the system'}
            </p>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="admin-empty-card-inner">
            <AlertCircle size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No orders matching criteria</p>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
              Try adjusting your search query or active status filters.
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="button button-outline" style={{ fontSize: '12px', padding: '8px 16px' }}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="admin-desktop-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items & Sellers</th>
                    <th>Payment</th>
                    <th>Fulfillment</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order: any) => {
                    const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                    const itemsCount = (order.order_items || []).reduce((acc: number, item: any) => acc + Number(item.quantity || 1), 0)

                    return (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>#{order.order_number}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>ID: {order.id.slice(0, 8)}...</div>
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px' }}>{orderDate}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '13px' }}>{order.profiles?.full_name || 'Guest Checkout'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{order.profiles?.email || '—'}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 500 }}>
                              {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                            </span>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(order.order_items || []).map((i: any) => i.product_name).join(', ')}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : order.payment_status === 'failed' ? 'suspended' : 'pending'}`}>
                            {order.payment_status?.toUpperCase() || 'UNPAID'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${order.status === 'delivered' ? 'delivered' : order.status === 'shipped' ? 'shipped' : order.status === 'cancelled' ? 'cancelled' : order.status === 'confirmed' ? 'approved' : 'processing'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {money(Number(order.total_amount || 0))}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Link href={`/admin/orders/${order.id}`} className="button button-outline" style={{ fontSize: '11px', padding: '5px 12px', whiteSpace: 'nowrap' }}>
                              View
                            </Link>
                            <PrintReceiptTrigger
                              order={order}
                              audience="admin"
                              label="Print"
                              className="button button-ghost"
                              style={{ fontSize: '11px', padding: '5px 10px', minHeight: '30px', border: '1px solid var(--border)' }}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="admin-mobile-card-list">
              {filteredOrders.map((order: any) => {
                const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
                const itemsCount = (order.order_items || []).reduce((acc: number, item: any) => acc + Number(item.quantity || 1), 0)

                return (
                  <div key={order.id} className="admin-order-card-mobile">
                    <div className="admin-order-card-header">
                      <div>
                        <span className="admin-order-number">#{order.order_number}</span>
                        <span className="admin-order-date">{orderDate}</span>
                      </div>
                      <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                        {order.payment_status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="admin-order-card-body">
                      <div className="admin-order-customer">
                        <span style={{ fontWeight: 500, fontSize: '13.5px' }}>{order.profiles?.full_name || 'Guest Checkout'}</span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{order.profiles?.email || '—'}</span>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                          {itemsCount} item{itemsCount !== 1 ? 's' : ''} purchased
                        </div>
                      </div>

                      <div className="admin-order-total-block">
                        <span className="admin-order-amount">{money(Number(order.total_amount || 0))}</span>
                        <span className={`status-pill ${order.status === 'delivered' ? 'delivered' : order.status === 'shipped' ? 'shipped' : order.status === 'cancelled' ? 'cancelled' : 'processing'}`} style={{ fontSize: '10px' }}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="admin-order-card-footer" style={{ display: 'flex', gap: '8px' }}>
                      <Link 
                        href={`/admin/orders/${order.id}`} 
                        className="button button-outline" 
                        style={{ flex: 1, textAlign: 'center', fontSize: '12px', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <span>View</span>
                        <ChevronRight size={14} />
                      </Link>
                      <PrintReceiptTrigger
                        order={order}
                        audience="admin"
                        label="Print"
                        className="button button-ghost"
                        style={{ flex: 1, justifyContent: 'center', fontSize: '12px', padding: '10px 0', minHeight: '40px', border: '1px solid var(--border)' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
