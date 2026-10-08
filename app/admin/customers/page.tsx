import React from 'react'
import type { Metadata } from 'next'
import { getAdminCustomers } from '@/lib/admin'
import { money } from '@/lib/catalog'
import { Users, ShoppingBag, ShieldCheck, UserCheck, Mail, Phone, Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Client Directory — SENO Admin',
  robots: {
    index: false,
    follow: false
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers()

  const totalSpentAll = customers.reduce((acc, c) => acc + (c.totalSpent || 0), 0)
  const activeBuyers = customers.filter(c => c.ordersCount > 0).length

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">CLIENT RELATIONS</span>
          <h1 className="admin-page-title">Client Directory</h1>
          <p className="admin-page-subtitle">
            Authenticated customer accounts, purchase history, lifetime value, and role profiles.
          </p>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Total Clients</span>
              <Users size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{customers.length}</div>
          </div>
          <div className="kpi-meta">Registered platform profiles</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Active Buyers</span>
              <UserCheck size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{activeBuyers}</div>
          </div>
          <div className="kpi-meta">Placed at least 1 verified purchase</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Client Lifetime Volume</span>
              <ShoppingBag size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{money(totalSpentAll)}</div>
          </div>
          <div className="kpi-meta">Cumulative settled customer GMV</div>
        </div>
      </div>

      {/* Customers List Card */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <h2 className="admin-card-heading">All Registered Clients ({customers.length})</h2>
            <p className="admin-card-subheading">Authoritative database profiles</p>
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="admin-empty-card-inner">
            <Users size={36} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No client accounts found</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>When customers sign up, their profiles will appear here.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="admin-desktop-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Orders</th>
                    <th>Lifetime Value</th>
                    <th style={{ textAlign: 'right' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer: any) => {
                    const joinedDate = new Date(customer.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                    return (
                      <tr key={customer.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            {customer.full_name || 'Guest / Unnamed'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                            ID: {customer.id.slice(0, 8)}...
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '13px' }}>{customer.email || '—'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{customer.phone || 'No phone'}</div>
                        </td>
                        <td>
                          <span className={`status-pill ${customer.role === 'admin' ? 'approved' : customer.role === 'reseller' ? 'pending' : 'draft'}`}>
                            {customer.role?.toUpperCase() || 'CUSTOMER'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{customer.ordersCount}</span> order{customer.ordersCount !== 1 ? 's' : ''}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {money(customer.totalSpent || 0)}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '12px', color: 'var(--muted)' }}>
                          {joinedDate}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="admin-mobile-card-list">
              {customers.map((customer: any) => {
                const joinedDate = new Date(customer.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
                return (
                  <div key={customer.id} className="admin-order-card-mobile">
                    <div className="admin-order-card-header">
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                          {customer.full_name || 'Unnamed Client'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>
                          {customer.email || '—'}
                        </span>
                      </div>
                      <span className={`status-pill ${customer.role === 'admin' ? 'approved' : 'draft'}`}>
                        {customer.role?.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Purchases</span>
                        <strong style={{ fontSize: '13px' }}>{customer.ordersCount} orders</strong>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block' }}>Lifetime Spent</span>
                        <strong style={{ fontSize: '14px' }}>{money(customer.totalSpent || 0)}</strong>
                      </div>
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
