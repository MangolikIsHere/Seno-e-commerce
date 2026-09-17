import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowUpRight, Boxes, CircleDollarSign, Package, ShoppingBag, Store, Truck } from 'lucide-react'
import { getMySellerRecord, getSellerProposals, getSellerStudioStats } from '@/lib/sellers'
import { CommissionProposalCard } from './CommissionProposalCard'

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
    <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: '36px', alignItems: 'start' }}>
      <aside style={{ position: 'sticky', top: '24px' }}><span className="section-kicker">SELLER STUDIO</span><h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '26px', margin: '8px 0 24px' }}>{seller.store_name}</h1><nav style={{ display: 'grid', gap: '4px' }}>{navItems.map(({ label, href, icon: Icon }) => <Link key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', color: label === 'Overview' ? 'var(--ink)' : 'var(--muted)', textDecoration: 'none', borderLeft: label === 'Overview' ? '2px solid var(--ink)' : '2px solid transparent', fontSize: '12px' }}><Icon size={15} />{label}</Link>)}</nav></aside>
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '24px', marginBottom: '24px' }}><div><span className="section-kicker">OVERVIEW</span><h2 className="static-page-title" style={{ margin: '6px 0' }}>Good to see you, {seller.store_name}</h2><p style={{ color: 'var(--muted)', margin: 0 }}>Your catalog, approvals, and fulfillment activity at a glance.</p></div><Link href="/seller/products/new" className="button button-primary">Add Product <ArrowUpRight size={14} /></Link></div>
        <div className="kpi-grid" style={{ marginBottom: '28px' }}>{cards.map(([label, value, Icon]) => <div className="kpi-card" key={label} style={{ flexDirection: 'column', minHeight: '112px' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}><span>{label}</span><Icon size={15} /></div><strong style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, marginTop: '18px' }}>{value}</strong></div>)}<div className="kpi-card" style={{ flexDirection: 'column', minHeight: '112px' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}><span>Commission Rate</span><CircleDollarSign size={15} /></div><strong style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, marginTop: '18px' }}>{metrics.commissionRate}%</strong></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, .8fr)', gap: '20px' }}><section className="admin-table-card" style={{ padding: '22px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '18px' }}><div><span className="section-kicker">ACTION REQUIRED</span><h3 style={{ margin: '6px 0 0', fontSize: '18px', fontWeight: 500 }}>Keep the studio moving</h3></div><AlertCircle size={18} color={actions.length ? '#9a3412' : 'var(--muted)'} /></div>{actions.length ? <div style={{ display: 'grid', gap: '8px' }}>{actions.map((action, index) => <Link key={`${action.label}-${index}`} href={action.href} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border)', color: 'var(--ink)', textDecoration: 'none', fontSize: '13px' }}>{action.label}<ArrowUpRight size={14} /></Link>)}</div> : <p style={{ color: 'var(--muted)', margin: 0 }}>Nothing needs your attention right now.</p>}</section><section className="admin-table-card" style={{ padding: '22px' }}><span className="section-kicker">STORE STATUS</span><h3 style={{ margin: '6px 0 18px', fontSize: '18px', fontWeight: 500 }}>Partner account</h3><div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Status</span><strong style={{ textTransform: 'capitalize' }}>{seller.seller_status}</strong></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Store slug</span><span>/{seller.slug}</span></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Contact</span><span>{seller.contact_email}</span></div></div><Link href="/account" className="button button-outline" style={{ marginTop: '20px', justifyContent: 'center' }}>Manage Store Profile</Link></section></div>
      </section>
    </div>
  </main>
}
