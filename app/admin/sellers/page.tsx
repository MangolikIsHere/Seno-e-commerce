import { getPendingSellers } from '@/lib/admin'
import { SellerStatusForm } from './SellerStatusForm'
import { Store, CheckCircle, Clock, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminSellersPage() {
  const sellers = await getPendingSellers()

  const pendingCount = sellers.filter((s: any) => s.seller_status === 'pending').length
  const approvedCount = sellers.filter((s: any) => s.seller_status === 'approved').length

  return (
    <div>
      {/* Page Header */}
      <div className="admin-top-bar">
        <div>
          <h1 className="admin-page-title">Marketplace Sellers</h1>
          <p className="admin-page-subtitle">
            Manage partner brand and reseller onboarding, commission terms, and store visibility
          </p>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Total Sellers</span>
            <Store size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{sellers.length}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Pending Applications</span>
            <Clock size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{pendingCount}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Active / Approved</span>
            <CheckCircle size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{approvedCount}</div>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Registered Sellers</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>All multi-vendor partners and applicants</div>
          </div>
        </div>

        {sellers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <AlertCircle size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>No sellers found in the system.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Store / Brand</th>
                  <th>Contact Details</th>
                  <th>Status</th>
                  <th>Commission</th>
                  <th style={{ textAlign: 'right' }}>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((seller: any) => (
                  <tr key={seller.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{seller.store_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>slug: /{seller.slug}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{seller.contact_email || '—'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{seller.contact_phone || 'No phone'}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${seller.seller_status === 'approved' ? 'approved' : seller.seller_status === 'rejected' ? 'rejected' : seller.seller_status === 'suspended' ? 'suspended' : 'pending'}`}>
                        {seller.seller_status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>
                        {seller.commission_rate != null ? `${seller.commission_rate}%` : '15% (default)'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <a 
                        href={`/admin/sellers/${seller.id}`} 
                        className="button button-outline"
                        style={{ fontSize: '11px', padding: '5px 10px', textDecoration: 'none' }}
                      >
                        Review
                      </a>
                      <SellerStatusForm 
                        sellerId={seller.id} 
                        currentStatus={seller.seller_status} 
                        currentCommission={seller.commission_rate} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

