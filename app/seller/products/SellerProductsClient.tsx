'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowUpRight, Filter, Package, Plus, Search } from 'lucide-react'
import { money } from '@/lib/catalog'
import { SenoImage } from '@/components/SenoImage'

export function SellerProductsClient({ products, categories }: { products: any[]; categories: any[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [stock, setStock] = useState('all')
  const [sort, setSort] = useState('newest')

  const filteredProducts = useMemo(() => products.filter(product => {
    const text = query.trim().toLowerCase()
    if (text && !product.name.toLowerCase().includes(text) && !product.slug.toLowerCase().includes(text) && !(product.product_variants || []).some((variant: any) => variant.sku?.toLowerCase().includes(text))) return false
    if (status !== 'all' && product.approval_status !== status) return false
    if (category !== 'all' && product.category_id !== category) return false
    if (stock === 'low' && !product.low_stock) return false
    if (stock === 'out' && product.total_stock !== 0) return false
    if (stock === 'available' && product.total_stock === 0) return false
    return true
  }).sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sort === 'price_low') return Number(a.price) - Number(b.price)
    if (sort === 'price_high') return Number(b.price) - Number(a.price)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }), [products, query, status, category, stock, sort])

  const hasActiveFilters = query.trim() !== '' || status !== 'all' || category !== 'all' || stock !== 'all' || sort !== 'newest'

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '18px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div>
          <span className="section-kicker">SELLER STUDIO / CATALOG</span>
          <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: '28px' }}>Product Library</h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
            Manage submitted listings, catalog pricing, live inventory, and SENO review statuses.
          </p>
        </div>
        <Link href="/seller/products/new" className="button button-primary" style={{ padding: '10px 20px', fontSize: '11px', gap: '6px' }}>
          <Plus size={14} /> Add New Product
        </Link>
      </div>

      <div className="admin-table-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'center' }}>
          <div style={{ position: 'relative', gridColumn: 'span 1' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input 
              aria-label="Search products" 
              value={query} 
              onChange={event => setQuery(event.target.value)} 
              placeholder="Search by name, slug, or SKU..." 
              className="input-field" 
              style={{ paddingLeft: '36px' }} 
            />
          </div>

          <select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)} className="input-field">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Pending Review</option>
            <option value="approved">Approved & Active</option>
            <option value="rejected">Action Required / Rejected</option>
          </select>

          <select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)} className="input-field">
            <option value="all">All Categories</option>
            {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>

          <select aria-label="Filter by stock" value={stock} onChange={event => setStock(event.target.value)} className="input-field">
            <option value="all">All Inventory</option>
            <option value="available">In Stock (&gt; 5)</option>
            <option value="low">Low Stock (&le; 5)</option>
            <option value="out">Out of Stock (0)</option>
          </select>

          <select aria-label="Sort products" value={sort} onChange={event => setSort(event.target.value)} className="input-field">
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="price_low">Sort: Price Low to High</option>
            <option value="price_high">Sort: Price High to Low</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--muted)' }}>
            <span>Filtered: Showing {filteredProducts.length} of {products.length} products</span>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setStatus('all')
                setCategory('all')
                setStock('all')
                setSort('newest')
              }}
              style={{ color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', fontSize: '11px' }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="admin-table-card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <Filter size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} strokeWidth={1.3} />
          <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 6px' }}>No products match your criteria</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
            Try resetting your search query or filters to view all catalog items.
          </p>
          <Link href="/seller/products/new" className="button button-outline" style={{ padding: '10px 20px', fontSize: '11px' }}>
            <Plus size={14} /> Add New Product
          </Link>
        </div>
      ) : (
        <div className="admin-table-card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: '12px' }}>
            <span>Showing {filteredProducts.length} products</span>
            <span style={{ fontSize: '11px' }}>Updated in real-time</span>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '260px' }}>Product & Slug</th>
                <th>Department</th>
                <th>Retail Price</th>
                <th>Units in Stock</th>
                <th>Review Status</th>
                <th>Last Modified</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '46px', height: '60px', overflow: 'hidden', background: 'var(--surface-subtle)', flexShrink: 0, borderRadius: '2px', border: '1px solid var(--border)' }}>
                        <SenoImage src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{product.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                          /{product.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', background: 'var(--surface-subtle)', padding: '2px 8px', borderRadius: '2px', border: '1px solid var(--border)' }}>
                      {product.categories?.name || 'Uncategorized'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '13px' }}>{money(Number(product.price))}</strong>
                  </td>
                  <td>
                    <span 
                      style={{ 
                        fontWeight: 600,
                        color: product.total_stock === 0 ? '#9f1239' : product.low_stock ? '#9a3412' : '#15803d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {product.total_stock}
                      <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 400 }}>
                        {product.total_stock === 0 ? '(Out of stock)' : product.low_stock ? '(Low stock)' : 'units'}
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${product.approval_status === 'approved' ? 'approved' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}>
                      {product.approval_status === 'submitted' ? 'Pending Review' : product.approval_status}
                    </span>
                    {product.is_sold_out && (
                      <span className="status-pill rejected" style={{ marginTop: '4px', display: 'inline-block' }}>Manually Sold Out</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '12px' }}>
                    {new Date(product.updated_at || product.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={async () => {
                          const fd = new FormData()
                          fd.append('productId', product.id)
                          fd.append('isSoldOut', String(!product.is_sold_out))
                          const { toggleProductSoldOutAction } = await import('@/lib/sellers')
                          await toggleProductSoldOutAction(fd)
                        }}
                        className="button button-outline"
                        style={{ fontSize: '11px', padding: '6px 12px', gap: '4px' }}
                      >
                        {product.is_sold_out ? 'Mark Available' : 'Mark Sold Out'}
                      </button>
                      <Link 
                        href={`/seller/products/${product.id}/edit`} 
                        className="button button-outline" 
                        style={{ fontSize: '11px', padding: '6px 12px', gap: '4px' }}
                      >
                        Edit <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
