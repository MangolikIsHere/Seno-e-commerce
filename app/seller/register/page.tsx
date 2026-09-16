import { redirect } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import { RegisterSellerForm } from './RegisterSellerForm'
import Link from 'next/link'

export default async function RegisterSellerPage() {
  const seller = await getMySellerRecord()

  if (seller) {
    if (seller.seller_status === 'pending') {
      return (
        <div className="static-page-container" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '100px' }}>
          <h1 className="static-page-title">Application Under Review</h1>
          <p style={{ color: 'var(--muted)', marginTop: '16px' }}>
            Your seller application for <strong>{seller.store_name}</strong> is currently being reviewed by our team.
          </p>
          <Link href="/account" className="dark-btn" style={{ display: 'inline-block', marginTop: '32px' }}>
            RETURN TO ACCOUNT
          </Link>
        </div>
      )
    }

    if (seller.seller_status === 'approved' || seller.seller_status === 'commission_proposed' || seller.seller_status === 'commission_negotiation') {
      redirect('/seller/dashboard')
    }

    if (seller.seller_status === 'rejected') {
      return (
        <div className="static-page-container" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '100px' }}>
          <h1 className="static-page-title">Application Rejected</h1>
          <p style={{ color: 'var(--muted)', marginTop: '16px' }}>
            Unfortunately, your seller application for <strong>{seller.store_name}</strong> has been rejected.
          </p>
          <Link href="/account" className="outline-btn" style={{ display: 'inline-block', marginTop: '32px' }}>
            RETURN TO ACCOUNT
          </Link>
        </div>
      )
    }

    if (seller.seller_status === 'suspended') {
      return (
        <div className="static-page-container" style={{ maxWidth: '600px', textAlign: 'center', paddingTop: '100px' }}>
          <h1 className="static-page-title">Account Suspended</h1>
          <p style={{ color: 'var(--muted)', marginTop: '16px' }}>
            Your seller account has been suspended. Please contact support.
          </p>
        </div>
      )
    }
  }

  return (
    <div className="static-page-container" style={{ maxWidth: '600px' }}>
      <span className="section-kicker">JOIN SENO MARKETPLACE</span>
      <h1 className="static-page-title" style={{ marginBottom: '32px' }}>Become a Seller</h1>
      <p style={{ color: 'var(--muted)', marginBottom: '48px' }}>
        Apply to become an independent reseller on the SENO marketplace.
        Please provide your store and contact details below. Our team will review your application.
      </p>

      <RegisterSellerForm />
    </div>
  )
}
