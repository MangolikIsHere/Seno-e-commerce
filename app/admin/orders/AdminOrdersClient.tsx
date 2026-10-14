'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  Store,
  ShieldCheck,
  Truck
} from 'lucide-react'
import { money } from '@/lib/catalog'
import { PrintReceiptTrigger } from '@/components/receipt/PrintReceiptTrigger'
import { formatStateLabel } from '@/lib/utils'
import { 
  groupOrderItemsBySeller, 
  SellerOrderGroup, 
  PLATFORM_SELLER_ID, 
  PLATFORM_STORE_NAME 
} from '@/lib/sellerOrderHelpers'

interface AdminOrdersClientProps {
  initialOrders: any[]
}

export function AdminOrdersClient({ initialOrders }: AdminOrdersClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sellerFilter, setSellerFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({})

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  // Extract all distinct sellers from the initial dataset
  const availableSellers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; isPlatform: boolean; isMissing: boolean }>()
    for (const order of initialOrders) {
      const groups = groupOrderItemsBySeller(order.order_items || [])
      for (const g of groups) {
        if (!map.has(g.sellerId)) {
          map.set(g.sellerId, {
            id: g.sellerId,
            name: g.sellerName,
            isPlatform: g.isPlatform,
            isMissing: g.isMissing
          })
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.isPlatform) return -1
      if (b.isPlatform) return 1
      if (a.isMissing) return 1
      if (b.isMissing) return -1
      return a.name.localeCompare(b.name)
    })
  }, [initialOrders])

  // Count multi-seller orders in dataset
  const multiSellerOrdersCount = useMemo(() => {
    return initialOrders.filter(order => {
      const groups = groupOrderItemsBySeller(order.order_items || [])
      return groups.length > 1
    }).length
  }, [initialOrders])

  // Summary Metrics
  const paidOrders = initialOrders.filter((o: any) => o.payment_status === 'paid')
  const totalSettledGross = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || 0), 0)
  const pendingCount = initialOrders.filter((o: any) => o.payment_status === 'unpaid' || o.status === 'pending').length

  // Filter calculations
  const filteredOrders = useMemo(() => {
    return initialOrders.filter(order => {
      const groups = groupOrderItemsBySeller(order.order_items || [])
      const isMultiSeller = groups.length > 1

      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchNumber = order.order_number?.toLowerCase().includes(q)
        const matchCustomer = order.profiles?.full_name?.toLowerCase().includes(q)
        const matchEmail = order.profiles?.email?.toLowerCase().includes(q)
        const matchId = order.id?.toLowerCase().includes(q)
        const matchSeller = groups.some(g => g.sellerName.toLowerCase().includes(q))
        const matchProduct = (order.order_items || []).some((i: any) => 
          i.product_name?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q)
        )
        if (!matchNumber && !matchCustomer && !matchEmail && !matchId && !matchSeller && !matchProduct) {
          return false
        }
      }

      // 2. Seller Filter
      if (sellerFilter !== 'all') {
        if (sellerFilter === 'multi_seller') {
          if (!isMultiSeller) return false
        } else if (sellerFilter === 'platform_only') {
          const hasPlatform = groups.some(g => g.isPlatform)
          if (!hasPlatform) return false
        } else if (sellerFilter === 'missing_seller') {
          const hasMissing = groups.some(g => g.isMissing)
          if (!hasMissing) return false
        } else {
          // Specific seller by id or name
          const hasSeller = groups.some(g => g.sellerId === sellerFilter || g.sellerName === sellerFilter)
          if (!hasSeller) return false
        }
      }

      // 3. Payment Filter
      if (paymentFilter !== 'all') {
        if (order.payment_status !== paymentFilter) return false
      }

      // 4. Fulfillment Status Filter
      if (statusFilter !== 'all') {
        // Matches either parent order status OR any item's fulfillment_status
        const orderMatch = order.status === statusFilter
        const itemMatch = (order.order_items || []).some((i: any) => i.fulfillment_status === statusFilter)
        if (!orderMatch && !itemMatch) return false
      }

      return true
    })
  }, [initialOrders, searchQuery, sellerFilter, paymentFilter, statusFilter])

  const hasActiveFilters = searchQuery !== '' || sellerFilter !== 'all' || paymentFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setSellerFilter('all')
    setPaymentFilter('all')
    setStatusFilter('all')
  }

  return (
    <div>
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">LEDGER &amp; FULFILLMENT</span>
          <h1 className="admin-page-title">Platform Orders Ledger</h1>
          <p className="admin-page-subtitle">
            Authoritative multi-seller order attribution, seller-specific fulfillment, settlement tracking, and logistics controls.
          </p>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>All Orders</span>
              <ShoppingBag size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{initialOrders.length}</div>
          </div>
          <div className="kpi-meta">Parent customer checkouts</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Settled Volume</span>
              <CreditCard size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{money(totalSettledGross)}</div>
          </div>
          <div className="kpi-meta">Across {paidOrders.length} verified paid orders</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Multi-Seller Orders</span>
              <Layers size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{multiSellerOrdersCount}</div>
          </div>
          <div className="kpi-meta">Orders with &gt; 1 vendor</div>
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
              placeholder="Search by Order #, customer name, email, seller / store name, product or SKU..."
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

          {/* Filters Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            {/* Seller Filter Selector */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Store size={14} color="var(--muted)" />
              <span style={{ fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                Seller:
              </span>
              <select
                value={sellerFilter}
                onChange={e => setSellerFilter(e.target.value)}
                className="input-field"
                style={{
                  fontSize: '12px',
                  padding: '5px 10px',
                  minWidth: '180px',
                  height: '32px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Sellers</option>
                <option value="multi_seller">Multi-Seller Orders Only</option>
                <option value="platform_only">SENO Platform Only</option>
                <optgroup label="Registered Sellers">
                  {availableSellers.filter(s => !s.isPlatform && !s.isMissing).map(seller => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))}
                </optgroup>
                {availableSellers.some(s => s.isMissing) && (
                  <option value="missing_seller">⚠ Missing / Unattributed</option>
                )}
              </select>
            </div>

            <div style={{ width: '1px', height: '18px', background: 'var(--border)' }} />

            {/* Payment Filter Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginRight: '2px' }}>
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
            </div>

            <div style={{ width: '1px', height: '18px', background: 'var(--border)' }} />

            {/* Fulfillment Status Filter Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginRight: '2px' }}>
                Fulfillment:
              </span>
              {[
                { id: 'all', label: 'ALL' },
                { id: 'unfulfilled', label: 'UNFULFILLED' },
                { id: 'processing', label: 'PROCESSING' },
                { id: 'dispatched', label: 'DISPATCHED' },
                { id: 'in_transit', label: 'IN TRANSIT' },
                { id: 'delivered', label: 'DELIVERED' },
                { id: 'cancelled', label: 'CANCELLED' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`admin-filter-chip ${statusFilter === id ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="admin-clear-filter-btn"
                style={{ marginLeft: 'auto', fontSize: '11px', color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <X size={12} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          {/* Active Filter Indicator Banner */}
          {sellerFilter !== 'all' && (
            <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
              <Filter size={13} color="#0284c7" />
              <span>
                Filtering by seller: <strong>{
                  sellerFilter === 'multi_seller' ? 'Multi-Seller Orders'
                  : sellerFilter === 'platform_only' ? 'SENO Platform'
                  : sellerFilter === 'missing_seller' ? 'Missing Seller Records'
                  : availableSellers.find(s => s.id === sellerFilter)?.name || sellerFilter
                }</strong>.
                Displaying matching seller shipments alongside parent order context.
              </span>
            </div>
          )}
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
              {hasActiveFilters ? 'Showing filtered results' : 'All customer checkouts and seller attributions'}
            </p>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="admin-empty-card-inner">
            <AlertCircle size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No orders matching criteria</p>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted)' }}>
              Try adjusting your seller filter, search query, or payment/fulfillment filters.
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
                    <th style={{ width: '130px' }}>Order #</th>
                    <th style={{ width: '100px' }}>Date</th>
                    <th style={{ width: '150px' }}>Customer</th>
                    <th>Seller Attribution &amp; Items</th>
                    <th style={{ width: '90px' }}>Payment</th>
                    <th style={{ width: '110px' }}>Fulfillment</th>
                    <th style={{ textAlign: 'right', width: '130px' }}>Total</th>
                    <th style={{ textAlign: 'right', width: '110px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order: any) => {
                    const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                    const sellerGroups = groupOrderItemsBySeller(order.order_items || [])
                    const isMultiSeller = sellerGroups.length > 1
                    const isExpanded = !!expandedOrders[order.id]
                    const totalUnits = sellerGroups.reduce((acc, g) => acc + g.totalUnits, 0)

                    // If filtered by a specific seller, compute that seller's portion
                    const filteredGroup = sellerFilter !== 'all' && sellerFilter !== 'multi_seller'
                      ? sellerGroups.find(g => 
                          sellerFilter === 'platform_only' ? g.isPlatform 
                          : sellerFilter === 'missing_seller' ? g.isMissing
                          : (g.sellerId === sellerFilter || g.sellerName === sellerFilter)
                        )
                      : null

                    return (
                      <React.Fragment key={order.id}>
                        <tr style={{ background: isExpanded ? '#fafaf9' : 'transparent', borderBottom: isExpanded ? 'none' : undefined }}>
                          {/* Order # and Multi-Seller badge */}
                          <td style={{ verticalAlign: 'top' }}>
                            <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>#{order.order_number}</div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                                {order.id.slice(0, 8)}...
                              </div>
                            </Link>
                            {isMultiSeller && (
                              <div style={{ marginTop: '4px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe'
                                }}>
                                  <Layers size={10} />
                                  <span>{sellerGroups.length} Sellers</span>
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Date */}
                          <td style={{ verticalAlign: 'top' }}>
                            <div style={{ fontSize: '12.5px' }}>{orderDate}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Customer */}
                          <td style={{ verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 500, fontSize: '13px' }}>
                              {order.shipping_address?.recipient_name || order.profiles?.full_name || 'Guest'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                              {order.profiles?.email || '—'}
                            </div>
                          </td>

                          {/* Items & Sellers Summary */}
                          <td style={{ verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {/* Seller Group Pills */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                {sellerGroups.map((group, idx) => (
                                  <span
                                    key={group.sellerId + idx}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '3px',
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      background: group.isPlatform ? '#f0fdf4' : group.isMissing ? '#fffbeb' : '#f8fafc',
                                      color: group.isPlatform ? '#15803d' : group.isMissing ? '#b45309' : '#334155',
                                      border: `1px solid ${group.isPlatform ? '#bbf7d0' : group.isMissing ? '#fde68a' : '#e2e8f0'}`
                                    }}
                                  >
                                    {group.isPlatform ? (
                                      <ShieldCheck size={11} color="#15803d" />
                                    ) : group.isMissing ? (
                                      <AlertTriangle size={11} color="#b45309" />
                                    ) : (
                                      <Store size={11} color="#64748b" />
                                    )}
                                    <span>{group.sellerName}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: '2px' }}>
                                      ({group.totalUnits} {group.totalUnits === 1 ? 'item' : 'items'})
                                    </span>
                                  </span>
                                ))}
                              </div>

                              {/* Toggle items inspection button */}
                              <button
                                type="button"
                                onClick={() => toggleOrderExpand(order.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--ink)',
                                  fontSize: '11.5px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 0',
                                  textAlign: 'left'
                                }}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp size={13} />
                                    <span>Hide Products &amp; Variants ({totalUnits} total)</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={13} />
                                    <span>Inspect {totalUnits} Products &amp; Variants</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Payment */}
                          <td style={{ verticalAlign: 'top' }}>
                            <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : order.payment_status === 'failed' ? 'suspended' : 'pending'}`}>
                              {order.payment_status?.toUpperCase() || 'UNPAID'}
                            </span>
                          </td>

                          {/* Fulfillment */}
                          <td style={{ verticalAlign: 'top' }}>
                            <span className={`status-pill ${order.status === 'delivered' ? 'approved' : order.status === 'cancelled' ? 'rejected' : (order.status === 'shipped' || order.status === 'dispatched') ? 'shipped' : 'processing'}`}>
                              {order.status?.toUpperCase() || 'UNFULFILLED'}
                            </span>
                          </td>

                          {/* Order Total / Seller Subtotal */}
                          <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                            {filteredGroup ? (
                              <div>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                                  {money(filteredGroup.subtotal)}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                                  Seller Subtotal
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                  Order: {money(Number(order.total_amount || 0))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                                  {money(Number(order.total_amount || 0))}
                                </div>
                                {isMultiSeller && (
                                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>
                                    Across {sellerGroups.length} sellers
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
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

                        {/* Expanded Seller Groups Breakdown Drawer */}
                        {isExpanded && (
                          <tr style={{ background: '#fafaf9', borderBottom: '1px solid var(--border)' }}>
                            <td colSpan={8} style={{ padding: '12px 24px 20px' }}>
                              <div style={{ background: '#fff', borderRadius: '4px', border: '1px solid var(--border)', padding: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <span>Seller-Wise Fulfillment Breakdown (Order #{order.order_number})</span>
                                  {isMultiSeller && (
                                    <span style={{ color: '#1d4ed8', fontWeight: 500, fontSize: '11px' }}>
                                      Multi-Vendor Checkout: {sellerGroups.length} Separate Shipments
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                  {sellerGroups.map((group, gIdx) => (
                                    <div
                                      key={group.sellerId + gIdx}
                                      style={{
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        background: '#fff',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      {/* Seller Header */}
                                      <div style={{
                                        background: group.isPlatform ? '#f0fdf4' : group.isMissing ? '#fffbeb' : '#f8fafc',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottom: '1px solid #e2e8f0',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                      }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          {group.isPlatform ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 700 }}>
                                              <ShieldCheck size={12} />
                                              SENO Platform
                                            </span>
                                          ) : group.isMissing ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 700 }}>
                                              <AlertTriangle size={12} />
                                              Seller information unavailable [Investigation Required]
                                            </span>
                                          ) : (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e2e8f0', color: '#1e293b', padding: '2px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 700 }}>
                                              <Store size={12} />
                                              {group.sellerName}
                                            </span>
                                          )}

                                          {group.slug && !group.isPlatform && (
                                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                              slug: {group.slug}
                                            </span>
                                          )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                                          <div style={{ color: 'var(--muted)' }}>
                                            Subtotal: <strong style={{ color: 'var(--ink)' }}>{money(group.subtotal)}</strong>
                                          </div>
                                          {!group.isPlatform && group.commissionAmount > 0 && (
                                            <div style={{ color: 'var(--muted)' }}>
                                              Commission: <strong style={{ color: '#059669' }}>{money(group.commissionAmount)}</strong>
                                            </div>
                                          )}
                                          <div>
                                            Status: <span className={`status-pill ${group.fulfillmentStatusSummary === 'delivered' ? 'approved' : group.fulfillmentStatusSummary === 'cancelled' ? 'rejected' : 'processing'}`} style={{ fontSize: '10px' }}>
                                              {formatStateLabel(group.fulfillmentStatusSummary)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Products Table */}
                                      <div style={{ padding: '8px 14px' }}>
                                        {group.items.map((item: any, itmIdx: number) => {
                                          const variantColour = item.variant_details?.colour
                                          const variantSize = item.variant_details?.size
                                          const colourImages = item.products?.details?.__colour_images || {}
                                          const colourPrimaries = item.products?.details?.__colour_primaries || {}
                                          const normCol = variantColour ? variantColour.trim().toLowerCase() : ''
                                          const colourSpecificImage = normCol ? (colourPrimaries[normCol] || colourImages[normCol]?.[0]) : null
                                          const primaryImage = colourSpecificImage || item.products?.product_images?.find((img: any) => img.is_primary)?.url || item.products?.product_images?.[0]?.url

                                          return (
                                            <div
                                              key={item.id || itmIdx}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 0',
                                                borderBottom: itmIdx < group.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                                                gap: '12px'
                                              }}
                                            >
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                {/* Thumbnail */}
                                                <div style={{ width: '42px', height: '52px', position: 'relative', flexShrink: 0, background: '#f5f5f4', borderRadius: '2px', overflow: 'hidden' }}>
                                                  {primaryImage ? (
                                                    <Image src={primaryImage} alt={item.product_name} fill style={{ objectFit: 'cover' }} sizes="42px" />
                                                  ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                      <Package size={16} color="var(--muted)" />
                                                    </div>
                                                  )}
                                                </div>

                                                <div style={{ minWidth: 0 }}>
                                                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                                                    {item.product_name}
                                                  </div>
                                                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                                    SKU: {item.sku}
                                                    {variantSize ? ` · Size: ${variantSize}` : ''}
                                                    {variantColour && variantColour !== 'Default' ? ` · Colour: ${variantColour}` : ''}
                                                  </div>
                                                  {(item.carrier || item.tracking_number) && (
                                                    <div style={{ fontSize: '11px', color: '#0369a1', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                      <Truck size={11} />
                                                      <span>{item.carrier || 'Logistics'} · Waybill: {item.tracking_number}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              <div style={{ textAlign: 'right', flexShrink: 0, fontSize: '12px' }}>
                                                <div style={{ color: 'var(--muted)' }}>
                                                  {item.quantity} × {money(Number(item.unit_price))}
                                                </div>
                                                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                                                  {money(Number(item.total_price))}
                                                </div>
                                                <span className={`status-pill ${item.fulfillment_status === 'delivered' ? 'approved' : item.fulfillment_status === 'cancelled' ? 'rejected' : 'processing'}`} style={{ fontSize: '9px', marginTop: '3px' }}>
                                                  {formatStateLabel(item.fulfillment_status || 'unfulfilled')}
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
                const sellerGroups = groupOrderItemsBySeller(order.order_items || [])
                const isMultiSeller = sellerGroups.length > 1
                const isExpanded = !!expandedOrders[order.id]
                const totalUnits = sellerGroups.reduce((acc, g) => acc + g.totalUnits, 0)

                const filteredGroup = sellerFilter !== 'all' && sellerFilter !== 'multi_seller'
                  ? sellerGroups.find(g => 
                      sellerFilter === 'platform_only' ? g.isPlatform 
                      : sellerFilter === 'missing_seller' ? g.isMissing
                      : (g.sellerId === sellerFilter || g.sellerName === sellerFilter)
                    )
                  : null

                return (
                  <div key={order.id} className="admin-order-card-mobile">
                    {/* Mobile Card Header */}
                    <div className="admin-order-card-header">
                      <div>
                        <span className="admin-order-number">#{order.order_number}</span>
                        <span className="admin-order-date">{orderDate}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {isMultiSeller && (
                          <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                            {sellerGroups.length} Sellers
                          </span>
                        )}
                        <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                          {order.payment_status?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Mobile Card Body */}
                    <div className="admin-order-card-body">
                      <div className="admin-order-customer">
                        <span style={{ fontWeight: 500, fontSize: '13.5px' }}>
                          {order.shipping_address?.recipient_name || order.profiles?.full_name || 'Guest Checkout'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                          {order.profiles?.email || '—'}
                        </span>
                        
                        {/* Sellers list preview */}
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {sellerGroups.map((g, i) => (
                            <span
                              key={g.sellerId + i}
                              style={{
                                fontSize: '10.5px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                background: g.isPlatform ? '#f0fdf4' : g.isMissing ? '#fffbeb' : '#f1f5f9',
                                color: g.isPlatform ? '#15803d' : g.isMissing ? '#b45309' : '#334155',
                                fontWeight: 500
                              }}
                            >
                              {g.sellerName} ({g.totalUnits})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="admin-order-total-block">
                        {filteredGroup ? (
                          <>
                            <span className="admin-order-amount">{money(filteredGroup.subtotal)}</span>
                            <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--muted)' }}>Seller Subtotal</span>
                            <span style={{ fontSize: '10px', color: 'var(--muted)' }}>Total: {money(Number(order.total_amount || 0))}</span>
                          </>
                        ) : (
                          <>
                            <span className="admin-order-amount">{money(Number(order.total_amount || 0))}</span>
                            <span className={`status-pill ${order.status === 'delivered' ? 'approved' : order.status === 'cancelled' ? 'rejected' : (order.status === 'shipped' || order.status === 'dispatched') ? 'shipped' : 'processing'}`} style={{ fontSize: '10px' }}>
                              {order.status}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expandable items section */}
                    <div style={{ padding: '0 16px 12px' }}>
                      <button
                        type="button"
                        onClick={() => toggleOrderExpand(order.id)}
                        style={{
                          width: '100%',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: '#334155'
                        }}
                      >
                        <span>{isExpanded ? 'Hide products' : `Inspect ${totalUnits} products & seller fulfillment`}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {sellerGroups.map((group, gi) => (
                            <div key={group.sellerId + gi} style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '10px', background: '#fff' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                                <strong style={{ fontSize: '12px', color: group.isPlatform ? '#15803d' : group.isMissing ? '#b45309' : '#0f172a' }}>
                                  {group.sellerName}
                                </strong>
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{money(group.subtotal)}</span>
                              </div>

                              {group.items.map((item: any, ii: number) => (
                                <div key={item.id || ii} style={{ fontSize: '12px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                                  <div>
                                    <div style={{ fontWeight: 500 }}>{item.product_name}</div>
                                    <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                                      {item.variant_details?.size ? `Size: ${item.variant_details.size}` : ''}
                                      {item.variant_details?.colour && item.variant_details.colour !== 'Default' ? ` · ${item.variant_details.colour}` : ''}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div>{item.quantity} × {money(Number(item.unit_price))}</div>
                                    <span className={`status-pill ${item.fulfillment_status === 'delivered' ? 'approved' : 'processing'}`} style={{ fontSize: '9px' }}>
                                      {formatStateLabel(item.fulfillment_status || 'unfulfilled')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Mobile Card Footer */}
                    <div className="admin-order-card-footer" style={{ display: 'flex', gap: '8px' }}>
                      <Link 
                        href={`/admin/orders/${order.id}`} 
                        className="button button-outline" 
                        style={{ flex: 1, textAlign: 'center', fontSize: '12px', padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      >
                        <span>View Dossier</span>
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
