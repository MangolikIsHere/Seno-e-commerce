import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  CircleDollarSign,
  ArrowRight,
  Plus,
  Boxes,
  Bell,
  HelpCircle,
  ShieldCheck,
  RotateCcw
} from 'lucide-react'
import { getMySellerRecord, getSellerProposals, getSellerDashboardData } from '@/lib/sellers'
import { CommissionProposalCard } from './CommissionProposalCard'
import { money } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function SellerDashboardPage() {
  const seller = await getMySellerRecord()
  if (!seller || seller.seller_status === 'pending' || seller.seller_status === 'rejected') {
    redirect('/seller/register')
  }

  if (seller.seller_status === 'commission_proposed' || seller.seller_status === 'commission_negotiation') {
    const proposals = await getSellerProposals()
    return (
      <div className="static-page-container" style={{ maxWidth: '800px', paddingTop: '40px', paddingBottom: '96px' }}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <span className="section-kicker">PARTNERSHIP ONBOARDING</span>
          <h1 className="static-page-title" style={{ margin: '8px 0 12px' }}>Partnership Commission Terms</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto' }}>
            Review and confirm your SENO luxury marketplace commission rate below to activate your store.
          </p>
        </div>
        <CommissionProposalCard proposal={proposals[proposals.length - 1]} status={seller.seller_status} />
      </div>
    )
  }

  if (seller.seller_status === 'suspended') {
    return (
      <div className="static-page-container" style={{ maxWidth: '640px', textAlign: 'center', paddingTop: '64px', paddingBottom: '96px' }}>
        <div style={{ border: '1px solid #fecdd3', background: '#fff1f2', borderRadius: '4px', padding: '32px 24px', marginBottom: '24px' }}>
          <AlertCircle size={40} color="#e11d48" style={{ margin: '0 auto 16px' }} />
          <h1 className="static-page-title" style={{ fontSize: '24px', margin: '0 0 12px', color: '#9f1239' }}>Account Temporarily Suspended</h1>
          <p style={{ color: '#475569', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
            Your seller dashboard has been restricted by SENO administration. Your live products are temporarily offline from customer search.
          </p>
          <Link href="/seller/help" className="button button-primary" style={{ padding: '10px 24px' }}>
            Contact Partner Support
          </Link>
        </div>
      </div>
    )
  }

  const dashboard = await getSellerDashboardData()
  if (!dashboard) redirect('/seller/register')

  const { metrics, actions, recentOrders, recentNotifications } = dashboard

  return (
    <main className="static-page-container seller-dashboard-page" style={{ maxWidth: '1180px', paddingBottom: '96px' }}>
      {/* 1. Header & Welcome Strip */}
      <section className="seller-dashboard-welcome-banner">
        <div className="seller-welcome-text">
          <span className="section-kicker">OVERVIEW & ACTIONS</span>
          <h1 className="seller-welcome-headline">Good to see you, {seller.store_name}</h1>
          <p className="seller-welcome-sub">
            Your store is active. Manage dispatches, inventory, and earnings below.
          </p>
        </div>

        <div className="seller-welcome-actions">
          <Link href="/seller/products/new" className="button button-primary" style={{ gap: '6px' }}>
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
        </div>
      </section>

      {/* 2. Priority Action Items (if any) */}
      {actions.length > 0 && (
        <section className="seller-action-required-card">
          <div className="seller-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#b45309" />
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Items Requiring Attention</h2>
            </div>
            <span className="seller-action-badge">{actions.length} pending</span>
          </div>

          <div className="seller-actions-list">
            {actions.map((act, idx) => (
              <Link
                key={idx}
                href={act.href}
                className={`seller-action-row ${act.severity === 'urgent' ? 'row-urgent' : act.severity === 'warning' ? 'row-warning' : ''}`}
              >
                <span className="seller-action-row-text">{act.label}</span>
                <span className="seller-action-row-arrow">
                  <span>Open</span>
                  <ArrowRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. Orders Overview Section */}
      <section className="seller-dashboard-section">
        <div className="seller-section-title-row">
          <div>
            <h2 className="seller-section-heading">Orders & Consignments</h2>
            <p className="seller-section-desc">Track items ordered by customers and awaiting your dispatch</p>
          </div>
          <Link href="/seller/orders" className="seller-section-link">
            <span>View all orders ({metrics.totalOrders})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="seller-stat-grid">
          <Link href="/seller/orders" className="seller-stat-card stat-urgent">
            <div className="stat-card-top">
              <span className="stat-label">New Orders to Pack</span>
              <Clock size={16} color="#d97706" />
            </div>
            <strong className="stat-number">{metrics.newOrders}</strong>
            <span className="stat-hint">
              {metrics.newOrders === 0 ? 'All caught up' : 'Awaiting fulfillment'}
            </span>
          </Link>

          <Link href="/seller/orders" className="seller-stat-card">
            <div className="stat-card-top">
              <span className="stat-label">Processing</span>
              <Truck size={16} color="var(--muted)" />
            </div>
            <strong className="stat-number">{metrics.processingOrders + metrics.inTransitOrders}</strong>
            <span className="stat-hint">Being packaged or in transit</span>
          </Link>

          <Link href="/seller/orders" className="seller-stat-card stat-success">
            <div className="stat-card-top">
              <span className="stat-label">Completed Orders</span>
              <CheckCircle2 size={16} color="#16a34a" />
            </div>
            <strong className="stat-number">{metrics.completedOrders}</strong>
            <span className="stat-hint">Successfully delivered</span>
          </Link>

          <Link href="/seller/orders" className="seller-stat-card">
            <div className="stat-card-top">
              <span className="stat-label">Total Orders</span>
              <ShoppingBag size={16} color="var(--muted)" />
            </div>
            <strong className="stat-number">{metrics.totalOrders}</strong>
            <span className="stat-hint">Lifetime customer consignments</span>
          </Link>
        </div>
      </section>

      {/* 4. Products & Stock Health Section */}
      <section className="seller-dashboard-section">
        <div className="seller-section-title-row">
          <div>
            <h2 className="seller-section-heading">Catalog & Stock Health</h2>
            <p className="seller-section-desc">Manage submitted listings, approval progress, and inventory levels</p>
          </div>
          <Link href="/seller/products" className="seller-section-link">
            <span>Manage products ({metrics.totalProducts})</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="seller-stat-grid">
          <Link href="/seller/products?status=approved" className="seller-stat-card stat-success">
            <div className="stat-card-top">
              <span className="stat-label">Live in Store</span>
              <ShieldCheck size={16} color="#16a34a" />
            </div>
            <strong className="stat-number">{metrics.activeProducts}</strong>
            <span className="stat-hint">Visible to SENO customers</span>
          </Link>

          <Link href="/seller/products?status=submitted" className="seller-stat-card">
            <div className="stat-card-top">
              <span className="stat-label">Awaiting Review</span>
              <Clock size={16} color="var(--muted)" />
            </div>
            <strong className="stat-number">{metrics.pendingReview}</strong>
            <span className="stat-hint">Under review by SENO Admin</span>
          </Link>

          <Link href="/seller/products?status=rejected" className={`seller-stat-card ${metrics.rejectedProducts > 0 ? 'stat-urgent' : ''}`}>
            <div className="stat-card-top">
              <span className="stat-label">Needs Revisions</span>
              <AlertCircle size={16} color={metrics.rejectedProducts > 0 ? '#e11d48' : 'var(--muted)'} />
            </div>
            <strong className="stat-number">{metrics.rejectedProducts}</strong>
            <span className="stat-hint">
              {metrics.rejectedProducts > 0 ? 'Admin feedback provided' : 'None need changes'}
            </span>
          </Link>

          <Link href="/seller/products?stock=low" className={`seller-stat-card ${metrics.lowStock > 0 ? 'stat-warning' : ''}`}>
            <div className="stat-card-top">
              <span className="stat-label">Low Stock</span>
              <Boxes size={16} color={metrics.lowStock > 0 ? '#d97706' : 'var(--muted)'} />
            </div>
            <strong className="stat-number">{metrics.lowStock}</strong>
            <span className="stat-hint">5 or fewer units remaining</span>
          </Link>

          <Link href="/seller/products?stock=out" className={`seller-stat-card ${metrics.outOfStock > 0 ? 'stat-urgent' : ''}`}>
            <div className="stat-card-top">
              <span className="stat-label">Out of Stock</span>
              <AlertTriangle size={16} color={metrics.outOfStock > 0 ? '#e11d48' : 'var(--muted)'} />
            </div>
            <strong className="stat-number">{metrics.outOfStock}</strong>
            <span className="stat-hint">
              {metrics.outOfStock > 0 ? 'Update variant quantities' : 'No empty stock'}
            </span>
          </Link>
        </div>
      </section>

      {/* 5. Earnings & Commission Overview */}
      <section className="seller-dashboard-section">
        <div className="seller-section-title-row">
          <div>
            <h2 className="seller-section-heading">Financials & Earnings</h2>
            <p className="seller-section-desc">Authoritative net sales and agreed platform commission terms</p>
          </div>
          <Link href="/seller/earnings" className="seller-section-link">
            <span>View earnings breakdown</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="seller-earnings-highlight-grid">
          <div className="seller-earnings-card">
            <span className="seller-earnings-label">Gross Order Sales</span>
            <strong className="seller-earnings-value">{money(metrics.grossSales)}</strong>
            <span className="seller-earnings-sub">Customer checkout total</span>
          </div>

          <div className="seller-earnings-card">
            <span className="seller-earnings-label">Agreed Commission Rate</span>
            <strong className="seller-earnings-value">{metrics.commissionRate}%</strong>
            <span className="seller-earnings-sub">
              SENO platform partnership rate
            </span>
          </div>

          <div className="seller-earnings-card">
            <span className="seller-earnings-label">Commission Deducted</span>
            <strong className="seller-earnings-value">{money(metrics.commissionDeducted)}</strong>
            <span className="seller-earnings-sub">Platform fee retained</span>
          </div>

          <div className="seller-earnings-card seller-earnings-card-net">
            <span className="seller-earnings-label">Net Vendor Payout</span>
            <strong className="seller-earnings-value text-emerald">{money(metrics.netEarnings)}</strong>
            <span className="seller-earnings-sub">Total earned from confirmed orders</span>
          </div>
        </div>
      </section>

      {/* 6. Admin Notices & Recent Notifications */}
      <section className="seller-dashboard-section">
        <div className="seller-section-title-row">
          <div>
            <h2 className="seller-section-heading">Administrator Notices & Updates</h2>
            <p className="seller-section-desc">Real-time alerts regarding approvals, commission, and orders</p>
          </div>
          <Link href="/seller/notifications" className="seller-section-link">
            <span>All notifications</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="seller-notices-container">
          {recentNotifications.length === 0 ? (
            <div className="seller-notices-empty">
              <Bell size={28} color="var(--muted)" style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '13px' }}>
                No active announcements or pending notices. You are up to date.
              </p>
            </div>
          ) : (
            <div className="seller-notices-list">
              {recentNotifications.map((notif: any) => {
                const isUnread = !notif.read_at
                return (
                  <div
                    key={notif.id}
                    className={`seller-notice-item ${isUnread ? 'notice-unread' : ''}`}
                  >
                    <div className="notice-icon-column">
                      <Bell size={16} />
                    </div>
                    <div className="notice-text-column">
                      <div className="notice-header-line">
                        <strong className="notice-title">{notif.title}</strong>
                        <span className="notice-date">
                          {new Date(notif.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                      </div>
                      <p className="notice-message">{notif.message}</p>
                    </div>
                    {notif.data?.deep_link && (
                      <Link href={notif.data.deep_link} className="notice-open-link">
                        <span>View</span>
                        <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
