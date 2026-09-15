import { getPendingProducts } from '@/lib/admin'
import { ProductApprovalForm } from './ProductApprovalForm'
import { getPrimaryProductImage, money } from '@/lib/catalog'
import Link from 'next/link'
import { Package, Clock, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

export default async function AdminProductsPage() {
  const products = await getPendingProducts()

  const pendingCount = products.filter((p: any) => p.approval_status === 'submitted').length
  const approvedCount = products.filter((p: any) => p.approval_status === 'approved').length

  return (
    <div>
      {/* Top Header */}
      <div className="admin-top-bar">
        <div>
          <h1 className="admin-page-title">Catalog & Product Review</h1>
          <p className="admin-page-subtitle">
            Curate and govern luxury marketplace listings, evaluate submitted items, and set approval states
          </p>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Total Products</span>
            <Package size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{products.length}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Awaiting Curation</span>
            <Clock size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{pendingCount}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Approved & Active</span>
            <CheckCircle size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{approvedCount}</div>
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Marketplace Catalog</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>All products submitted by SENO Platform and approved vendors</div>
          </div>
        </div>

        {products.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <AlertCircle size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>No products found in the catalog.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Price</th>
                  <th>Curation Status</th>
                  <th style={{ textAlign: 'right' }}>Review Decision</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => {
                  const coverImage = getPrimaryProductImage(product)

                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '44px',
                            height: '56px',
                            position: 'relative',
                            background: 'var(--surface-subtle)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            flexShrink: 0
                          }}>
                            <img
                              src={coverImage}
                              alt={product.name}
                              width={44}
                              height={56}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{product.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>slug: /{product.slug}</div>
                            <Link
                              href={`/products/${product.slug}`}
                              target="_blank"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '10px',
                                color: 'var(--muted)',
                                textDecoration: 'none',
                                marginTop: '2px'
                              }}
                            >
                              <span>Preview</span>
                              <ExternalLink size={10} />
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '13px' }}>
                          {product.sellers?.store_name || 'SENO Official'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {money(Number(product.price))}
                      </td>
                      <td>
                        <span className={`status-pill ${product.approval_status === 'approved' ? 'approved' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}>
                          {product.approval_status}
                        </span>
                        {product.rejection_reason && (
                          <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '4px', maxWidth: '180px' }}>
                            {product.rejection_reason}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <ProductApprovalForm 
                          productId={product.id} 
                          currentStatus={product.approval_status} 
                          currentReason={product.rejection_reason} 
                        />
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

