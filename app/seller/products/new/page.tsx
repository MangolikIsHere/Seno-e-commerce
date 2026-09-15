import { redirect } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import Link from 'next/link'

export default async function NewProductPage() {
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  return (
    <div className="static-page-container" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '32px' }}>
        <span className="section-kicker">SELLER DASHBOARD</span>
        <h1 className="static-page-title" style={{ margin: 0 }}>Add New Product</h1>
      </div>

      <div style={{ padding: '40px', border: '1px solid var(--border)', background: 'var(--soft)' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
          This interface handles product details, image uploads, and variants.
          <br /><br />
          <em>Note: Full variant management and Supabase Storage integration for image uploads is deferred for a dedicated Product UI component update, but the server-side foundation (actions, RLS, and triggers) is fully operational.</em>
        </p>

        <Link href="/seller/products" className="outline-btn">
          Back to Products
        </Link>
      </div>
    </div>
  )
}
