import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Package,
  Boxes,
  Truck,
  CircleDollarSign,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { getMySellerRecord } from '@/lib/sellers'

export const dynamic = 'force-dynamic'

export default async function SellerHelpPage() {
  const seller = await getMySellerRecord()
  if (!seller) {
    redirect('/seller/register')
  }

  const guides = [
    {
      title: 'How Product Approvals Work',
      icon: Package,
      steps: [
        'Submit your product with high-resolution photos, title, price, and variant sizes/colours.',
        'SENO catalog administrators review the product details to ensure brand and quality compliance.',
        'Once approved, your product goes live on the marketplace immediately.',
        'If changes are requested, the administrator leaves feedback on your product card for you to resolve and resubmit.'
      ]
    },
    {
      title: 'Inventory & Variant Management',
      icon: Boxes,
      steps: [
        'Add sizes and colours under the Variants section when creating or editing a product.',
        'Keep quantities accurate. When a variant reaches 0, customers can no longer select it.',
        'If you remove a colour or size, it is immediately reconciled and hidden from the storefront.',
        'You can quickly mark any product "Sold Out" at any time to temporarily pause orders.'
      ]
    },
    {
      title: 'Order Dispatch & Tracking',
      icon: Truck,
      steps: [
        'When a customer buys your item, it appears under "New to Pack" in Orders.',
        'Package the order securely with your packing slip.',
        'Assign a courier (e.g., Delhivery, Blue Dart, DHL) and enter the tracking number.',
        'Updating the dispatch status sends a notification to the customer with live tracking.'
      ]
    },
    {
      title: 'Commissions & Net Earnings',
      icon: CircleDollarSign,
      steps: [
        'Your agreed platform commission rate is applied at checkout when an order is confirmed.',
        'Commission rates are locked for confirmed orders and never modified retroactively.',
        'Review your itemized ledger and net vendor payout under the Earnings section.'
      ]
    }
  ]

  return (
    <main className="static-page-container seller-help-page" style={{ maxWidth: '1040px', paddingBottom: '96px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <span className="section-kicker">SELLER HANDBOOK & SUPPORT</span>
        <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: 'clamp(22px, 4vw, 28px)' }}>
          Help & Partner Support
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
          Straightforward guides and direct contact channels for SENO luxury marketplace sellers.
        </p>
      </div>

      {/* Direct Contact Cards */}
      <section className="seller-support-channels-grid" style={{ marginBottom: '36px' }}>
        <div className="admin-table-card seller-support-card">
          <div className="support-card-icon">
            <Mail size={22} color="#2563eb" />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>Seller Partner Desk</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 12px' }}>
              For catalog review inquiries, payouts, and compliance questions.
            </p>
            <a
              href="mailto:officialsenostore@gmail.com?subject=Seller%20Partner%20Inquiry%20-%20"
              className="button button-outline"
              style={{ fontSize: '11px', padding: '6px 14px' }}
            >
              officialsenostore@gmail.com
            </a>
          </div>
        </div>

        <div className="admin-table-card seller-support-card">
          <div className="support-card-icon">
            <MessageCircle size={22} color="#16a34a" />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>WhatsApp Partner Line</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 12px' }}>
              Direct message our merchant operations team during business hours.
            </p>
            <a
              href="https://wa.me/918116584285?text=Hello%20SENO%20team,%20I%20am%20a%20registered%20seller%20and%20need%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              className="button button-outline"
              style={{ fontSize: '11px', padding: '6px 14px' }}
            >
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Plain Language Seller Guides */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 16px' }}>
          Seller Operations Guide
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {guides.map((guide, idx) => {
            const Icon = guide.icon
            return (
              <div key={idx} className="admin-table-card" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ padding: '8px', background: 'var(--surface-subtle)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <Icon size={18} color="var(--ink)" />
                  </div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{guide.title}</h3>
                </div>

                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#475569', lineHeight: 1.6 }}>
                  {guide.steps.map((st, sIdx) => (
                    <li key={sIdx} style={{ marginBottom: '6px' }}>{st}</li>
                  ))}
                </ol>
              </div>
            )
          })}
        </div>
      </section>

      {/* Useful Shortcuts */}
      <section className="admin-table-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 14px' }}>Helpful Resources & Policies</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
          <Link href="/shipping-returns" target="_blank" className="seller-policy-link">
            <FileText size={14} />
            <span>Shipping & Returns Policy</span>
            <ExternalLink size={12} />
          </Link>
          <Link href="/terms" target="_blank" className="seller-policy-link">
            <FileText size={14} />
            <span>Marketplace Terms of Service</span>
            <ExternalLink size={12} />
          </Link>
          <Link href="/privacy" target="_blank" className="seller-policy-link">
            <FileText size={14} />
            <span>Privacy Policy</span>
            <ExternalLink size={12} />
          </Link>
        </div>
      </section>
    </main>
  )
}
