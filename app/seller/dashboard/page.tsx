import { redirect } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import Link from 'next/link'
import { Package, Truck, Store, ArrowUpRight, ShieldCheck, DollarSign } from 'lucide-react'

export default async function SellerDashboardPage() {
  const seller = await getMySellerRecord()

  if (!seller) {
    redirect('/seller/register')
  }

  if (seller.seller_status !== 'approved') {
    redirect('/seller/register') // Redirects back to the pending/rejected status page
  }

  return (
    <div className="static-page-container" style={{ maxWidth: '1040px', paddingBottom: '96px' }}>
      {/* Seller Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '20px',
        paddingBottom: '32px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '36px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="section-kicker" style={{ margin: 0 }}>PARTNER VENDOR PORTAL</span>
            <span className="status-pill approved" style={{ fontSize: '10px' }}>
              Verified Partner
            </span>
          </div>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            fontWeight: 400,
            letterSpacing: '-0.5px',
            margin: '4px 0 6px'
          }}>
            {seller.store_name}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            Vendor Slug: /{seller.slug} · Contact: {seller.contact_email}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/seller/products/new" className="button button-primary" style={{ fontSize: '12px', padding: '10px 18px' }}>
            Add New Product
          </Link>
          <Link href="/account" className="button button-outline" style={{ fontSize: '12px', padding: '10px 16px' }}>
            Client Account
          </Link>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="kpi-grid" style={{ marginBottom: '40px', gap: '20px' }}>
        {/* Store Status Card */}
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Vendor Status</span>
            <Store size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)', textTransform: 'capitalize' }}>
            {seller.seller_status}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
            Contracted Platform Commission: {seller.commission_rate != null ? `${seller.commission_rate}%` : '15%'}
          </div>
        </div>

        {/* Product Catalog Card */}
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Catalog Management</span>
            <Package size={16} color="var(--muted)" />
          </div>
          <div style={{ margin: '8px 0 16px' }}>
            <Link 
              href="/seller/products" 
              className="button button-outline"
              style={{ fontSize: '12px', padding: '8px 14px', width: '100%', justifyContent: 'center' }}
            >
              <span>Manage Products</span>
              <ArrowUpRight size={13} style={{ marginLeft: '4px' }} />
            </Link>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Submit new silhouettes for SENO curation review
          </div>
        </div>

        {/* Orders Card */}
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Fulfillment & Orders</span>
            <Truck size={16} color="var(--muted)" />
          </div>
          <div style={{ margin: '8px 0 16px' }}>
            <Link 
              href="/seller/orders" 
              className="button button-outline"
              style={{ fontSize: '12px', padding: '8px 14px', width: '100%', justifyContent: 'center' }}
            >
              <span>View Open Orders</span>
              <ArrowUpRight size={13} style={{ marginLeft: '4px' }} />
            </Link>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Process consignments and provide tracking details
          </div>
        </div>
      </div>
    </div>
  )
}

