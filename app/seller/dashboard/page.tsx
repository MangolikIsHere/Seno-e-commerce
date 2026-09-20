import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowUpRight, Boxes, CircleDollarSign, Package, ShoppingBag, Store, Truck } from 'lucide-react'
import { getMySellerRecord, getSellerProposals, getSellerStudioStats } from '@/lib/sellers'
import { CommissionProposalCard } from './CommissionProposalCard'

export const dynamic = 'force-dynamic'

const navItems = [
  { label: 'Overview', href: '/seller/dashboard', icon: Store },
  { label: 'Products', href: '/seller/products', icon: Package },
  { label: 'Orders', href: '/seller/orders', icon: Truck },
  { label: 'Inventory', href: '/seller/products', icon: Boxes },
  { label: 'Commission', href: '/seller/dashboard', icon: CircleDollarSign },
  { label: 'Store Profile', href: '/account', icon: Store }
]

export default async function SellerDashboardPage() {
  const seller = await getMySellerRecord()
  if (!seller || seller.seller_status === 'pending' || seller.seller_status === 'rejected') redirect('/seller/register')

  if (seller.seller_status === 'commission_proposed' || seller.seller_status === 'commission_negotiation') {
    const proposals = await getSellerProposals()
    return <div className="static-page-container" style={{ maxWidth: '800px', paddingTop: '64px' }}><div style={{ marginBottom: '40px', textAlign: 'center' }}><span className="section-kicker">PARTNERSHIP ONBOARDING</span><h1 className="static-page-title" style={{ margin: '8px 0 16px' }}>Commission Proposal</h1><p style={{ color: 'var(--muted)', fontSize: '15px' }}>Review your current SENO partnership terms below.</p></div><CommissionProposalCard proposal={proposals[proposals.length - 1]} status={seller.seller_status} /></div>
  }

  if (seller.seller_status === 'suspended') return <div className="static-page-container" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '100px' }}><h1 className="static-page-title">Account Suspended</h1><p style={{ color: 'var(--muted)' }}>Your seller account has been suspended. Please contact support.</p></div>

  const studio = await getSellerStudioStats()
  if (!studio) redirect('/seller/register')
  const { metrics, actions } = studio
  const cards = [
    ['Total Products', metrics.totalProducts, Package],
    ['Active Products', metrics.activeProducts, Store],
    ['Pending Review', metrics.pendingReview, AlertCircle],
    ['Low Stock', metrics.lowStock, Boxes],
    ['Out of Stock', metrics.outOfStock, AlertCircle],
    ['Orders', metrics.orders, ShoppingBag]
  ] as const

  return <main className="static-page-container" style={{ maxWidth: '1180px', paddingBottom: '96px' }}>
    <div className="seller-studio-grid">
      <aside style={{ position: 'sticky', top: '24px' }}><span className="section-kicker">SELLER STUDIO</span><h1 className="seller-store-name" style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 'clamp(17px, 5vw, 26px)', margin: '8px 0 24px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{seller.store_name}</h1><nav className="seller-nav" style={{ display: 'grid', gap: '4px' }}>{navItems.map(({ label, href, icon: Icon }) => <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', color: label === 'Overview' ? 'var(--ink)' : 'var(--muted)', textDecoration: 'none', borderLeft: label === 'Overview' ? '2px solid var(--ink)' : '2px solid transparent', fontSize: '12px', minHeight: '40px' }}><Icon size={15} />{label}</Link>)}</nav></aside>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '24px' }}><div><span className="section-kicker">OVERVIEW</span><h2 className="static-page-title seller-welcome-title" style={{ margin: '6px 0' }}>Good to see you, {seller.store_name}</h2><p style={{ color: 'var(--muted)', margin: 0 }}>Your catalog, approvals, and fulfillment activity at a glance.</p></div><Link href="/seller/products/new" className="button button-primary">Add Product <ArrowUpRight size={14} /></Link></div>
        <div className="kpi-grid seller-kpi-grid" style={{ marginBottom: '28px' }}>{cards.map(([label, value, Icon]) => <div className="kpi-card seller-kpi-card" key={label} style={{ flexDirection: 'column', minHeight: '80px' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', minWidth: 0 }}><span style={{ overflowWrap: 'break-word' }}>{label}</span><Icon size={15} /></div><strong style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, marginTop: '10px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{value}</strong></div>)}<div className="kpi-card seller-kpi-card" style={{ flexDirection: 'column', minHeight: '80px' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', minWidth: 0 }}><span>Commission Rate</span><CircleDollarSign size={15} /></div><strong style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, marginTop: '10px', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{metrics.commissionRate}%</strong></div></div>
        <div className="seller-sections-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}><section className="admin-table-card" style={{ padding: '16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', minWidth: 0 }}><div><span className="section-kicker">ACTION REQUIRED</span><h3 style={{ margin: '4px 0 0', fontSize: '15px', fontWeight: 500 }}>Keep the studio moving</h3></div><AlertCircle size={16} color={actions.length ? '#9a3412' : 'var(--muted)'} /></div>{actions.length ? <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>{actions.map((action, index) => <Link key={`${action.label}-${index}`} href={action.href} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)', color: 'var(--ink)', textDecoration: 'none', fontSize: '12px', minWidth: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{action.label}<ArrowUpRight size={12} /></Link>)}</div> : <p style={{ color: 'var(--muted)', margin: 0, fontSize: '12px' }}>Nothing needs your attention right now.</p>}</section><section className="admin-table-card" style={{ padding: '16px' }}><span className="section-kicker">STORE STATUS</span><h3 style={{ margin: '4px 0 14px', fontSize: '15px', fontWeight: 500 }}>Partner account</h3><div style={{ display: 'grid', gap: '8px', fontSize: '12px', minWidth: 0 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}><span style={{ color: 'var(--muted)', overflowWrap: 'break-word' }}>Status</span><strong style={{ textTransform: 'capitalize', textAlign: 'right', overflowWrap: 'break-word' }}>{seller.seller_status}</strong></div><div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}><span style={{ color: 'var(--muted)', overflowWrap: 'break-word' }}>Store slug</span><span style={{ textAlign: 'right', overflowWrap: 'break-word' }}>/{seller.slug}</span></div><div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}><span style={{ color: 'var(--muted)', overflowWrap: 'break-word' }}>Contact</span><span style={{ textAlign: 'right', overflowWrap: 'break-word' }}>{seller.contact_email}</span></div></div><Link href="/account" className="button button-outline" style={{ marginTop: '16px', justifyContent: 'center' }}>Manage Store Profile</Link></section></div>
      </section>
    </div>
  </main>
}
