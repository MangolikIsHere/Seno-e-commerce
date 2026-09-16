import { redirect } from 'next/navigation'
import { getSellerProducts, getMySellerRecord } from '@/lib/sellers'
import { money } from '@/lib/catalog'
import Link from 'next/link'
import { Plus, ArrowLeft, Package, ExternalLink } from 'lucide-react'
import { SenoImage } from '@/components/SenoImage'

export default async function SellerProductsPage() {
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const products = await getSellerProducts()

  return (
    <div className="static-page-container" style={{ maxWidth: '1040px', paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link 
          href="/seller/dashboard" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '0.5px'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Seller Dashboard</span>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div>
          <span className="section-kicker">PARTNER CATALOG</span>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '30px',
            fontWeight: 400,
            letterSpacing: '-0.5px',
            margin: '4px 0 6px'
          }}>
            My Products
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            Curate and manage your brand listings submitted to SENO
          </p>
        </div>
        <Link href="/seller/products/new" className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '10px 18px' }}>
          <Plus size={15} /> <span>Add New Product</span>
        </Link>
      </div>

      {products.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <Package size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
            You haven&apos;t added any products to your catalog yet.
          </p>
          <Link href="/seller/products/new" className="button button-primary" style={{ fontSize: '12px', padding: '10px 20px' }}>
            Create First Listing
          </Link>
        </div>
      ) : (
        <div className="admin-table-card">
          <div className="admin-table-header-row">
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Listed Silhouettes ({products.length})</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>All products submitted under your seller account</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Approval Status</th>
                  <th>Retail Price</th>
                  <th>Visibility</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '54px', flexShrink: 0, borderRadius: '2px', overflow: 'hidden', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
                          <SenoImage
                            src={(product as any).primary_image || (product as any).primaryImage || (product as any).image}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{product.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>slug: /{product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${product.approval_status === 'approved' ? 'approved' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}>
                        {product.approval_status}
                      </span>
                      {product.rejection_reason && (
                        <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '4px' }}>
                          Note: {product.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{money(Number(product.price))}</td>
                    <td>
                      <span style={{ fontSize: '12px', color: product.is_active ? 'var(--ink)' : 'var(--muted)' }}>
                        {product.is_active ? '● Live' : '○ Hidden'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        href={`/seller/products/${product.id}/edit`} 
                        className="button button-outline"
                        style={{ fontSize: '11px', padding: '5px 12px' }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

