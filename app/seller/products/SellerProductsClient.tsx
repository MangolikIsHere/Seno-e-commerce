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

  return <section>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', marginBottom: '22px' }}><div><span className="section-kicker">SELLER STUDIO / PRODUCTS</span><h1 className="static-page-title" style={{ margin: '6px 0' }}>Product Library</h1><p style={{ color: 'var(--muted)', margin: 0 }}>Manage submitted listings, stock, and review status.</p></div><Link href="/seller/products/new" className="button button-primary"><Plus size={15} /> Add Product</Link></div>
    <div className="admin-table-card" style={{ padding: '14px', marginBottom: '18px' }}><div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) repeat(4, minmax(130px, .35fr))', gap: '8px' }}><label style={{ position: 'relative' }}><Search size={14} style={{ position: 'absolute', left: '11px', top: '12px', color: 'var(--muted)' }} /><input aria-label="Search products" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, slug, SKU" className="input-field" style={{ paddingLeft: '34px', width: '100%' }} /></label><select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)} className="input-field"><option value="all">All statuses</option><option value="draft">Draft</option><option value="submitted">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select><select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)} className="input-field"><option value="all">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select aria-label="Filter by stock" value={stock} onChange={event => setStock(event.target.value)} className="input-field"><option value="all">All stock</option><option value="available">In stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select><select aria-label="Sort products" value={sort} onChange={event => setSort(event.target.value)} className="input-field"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="price_low">Price low</option><option value="price_high">Price high</option></select></div></div>
    {filteredProducts.length === 0 ? <div className="admin-table-card" style={{ padding: '64px 24px', textAlign: 'center' }}><Filter size={28} color="var(--muted)" style={{ margin: '0 auto 12px' }} /><h2 style={{ fontSize: '18px', fontWeight: 500 }}>No products match these filters</h2><p style={{ color: 'var(--muted)' }}>Adjust the filters or create your first listing.</p><Link href="/seller/products/new" className="button button-outline"><Plus size={14} /> Create Product</Link></div> : <div className="admin-table-card" style={{ overflowX: 'auto' }}><div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '12px' }}>{filteredProducts.length} of {products.length} products</div><table className="admin-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{filteredProducts.map(product => <tr key={product.id}><td><div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '230px' }}><div style={{ width: '44px', height: '58px', overflow: 'hidden', background: 'var(--surface-subtle)', flexShrink: 0 }}><SenoImage src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div><div><strong>{product.name}</strong><div style={{ fontSize: '11px', color: 'var(--muted)' }}>/{product.slug}</div></div></div></td><td>{product.categories?.name || 'Uncategorized'}</td><td>{money(Number(product.price))}</td><td><span style={{ color: product.total_stock === 0 ? '#9f1239' : product.low_stock ? '#9a3412' : 'var(--ink)' }}>{product.total_stock}</span></td><td><span className={`status-pill ${product.approval_status === 'approved' ? 'approved' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}>{product.approval_status}</span></td><td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '12px' }}>{new Date(product.updated_at || product.created_at).toLocaleDateString('en-IN')}</td><td><Link href={`/seller/products/${product.id}/edit`} className="button button-outline" style={{ fontSize: '11px', padding: '6px 10px' }}>Edit <ArrowUpRight size={12} /></Link></td></tr>)}</tbody></table></div>}
  </section>
}
