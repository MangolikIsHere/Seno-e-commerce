import { getSellerWithProposals } from '@/lib/admin'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Store, Mail, Phone, Calendar, ShieldCheck, User } from 'lucide-react'
import { AdminProposalForm } from './AdminProposalForm'

interface AdminSellerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminSellerDetailPage({ params }: AdminSellerDetailPageProps) {
  const resolvedParams = await params
  const sellerId = resolvedParams?.id

  const { seller, proposals } = await getSellerWithProposals(sellerId)

  if (!seller) {
    return (
      <div className="admin-page-container">
        <div className="admin-top-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/admin/sellers" className="button button-outline" style={{ padding: '8px', border: 'none' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="admin-page-title">Seller Review</h1>
            <p className="admin-page-subtitle">Partner dossier not found</p>
          </div>
        </div>

        <div className="admin-table-card" style={{ padding: '48px 24px', textAlign: 'center', marginTop: '24px' }}>
          <AlertCircle size={40} color="#b91c1c" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
            Seller Record Not Found
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '440px', margin: '0 auto 24px' }}>
            The requested seller ID <code style={{ background: 'var(--surface-subtle)', padding: '2px 6px', borderRadius: '4px' }}>{sellerId || 'unknown'}</code> does not match any registered partner account or may have been deleted.
          </p>
          <Link href="/admin/sellers" className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={14} />
            <span>Return to Partner Directory</span>
          </Link>
        </div>
      </div>
    )
  }

  const activeProposal = proposals && proposals.length > 0 ? proposals[proposals.length - 1] : undefined

  return (
    <div className="admin-page-container">
      {/* Header bar */}
      <div className="admin-top-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link 
          href="/admin/sellers" 
          className="button button-outline" 
          style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          title="Return to Partner Directory"
        >
          <ArrowLeft size={16} />
          <span style={{ fontSize: '12px' }}>Directory</span>
        </Link>
        <div>
          <span className="admin-kicker">SELLER DOSSIER</span>
          <h1 className="admin-page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>{seller.store_name}</span>
            <span className={`status-pill ${
              seller.seller_status === 'approved' ? 'approved' : 
              seller.seller_status === 'rejected' ? 'rejected' : 
              seller.seller_status === 'suspended' ? 'suspended' : 'pending'
            }`}>
              {seller.seller_status}
            </span>
          </h1>
          <p className="admin-page-subtitle">
            Slug: <code>/{seller.slug}</code> • Commission:{' '}
            <strong>{seller.commission_rate != null ? `${seller.commission_rate}%` : '15% default'}</strong>
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginTop: '24px' }}>
        {/* Business & Account Information */}
        <div className="admin-table-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <Store size={18} color="var(--ink)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>Business Profile</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px', fontSize: '13px' }}>
            <div style={{ color: 'var(--muted)' }}>Store Name</div>
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{seller.store_name}</div>
            
            <div style={{ color: 'var(--muted)' }}>Store Slug</div>
            <div>/{seller.slug}</div>

            <div style={{ color: 'var(--muted)' }}>Partner Status</div>
            <div>
              <span className={`status-pill ${
                seller.seller_status === 'approved' ? 'approved' : 
                seller.seller_status === 'rejected' ? 'rejected' : 
                seller.seller_status === 'suspended' ? 'suspended' : 'pending'
              }`}>
                {seller.seller_status}
              </span>
            </div>

            <div style={{ color: 'var(--muted)' }}>Commission Rate</div>
            <div>
              <strong>{seller.commission_rate != null ? `${seller.commission_rate}%` : '15% default'}</strong>
            </div>
            
            <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={13} />
              <span>Email</span>
            </div>
            <div>{seller.contact_email || '—'}</div>
            
            <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={13} />
              <span>Phone</span>
            </div>
            <div>{seller.contact_phone || '—'}</div>
            
            <div style={{ color: 'var(--muted)' }}>Description</div>
            <div style={{ whiteSpace: 'pre-wrap', color: seller.description ? 'var(--ink)' : 'var(--muted)' }}>
              {seller.description || 'No description provided'}
            </div>

            <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} />
              <span>Registered</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
              {seller.created_at ? new Date(seller.created_at).toLocaleString() : '—'}
            </div>
          </div>

          {/* Associated Profile Info */}
          {seller.profile && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <User size={14} color="var(--muted)" />
                <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', margin: 0 }}>
                  Applicant Profile
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ color: 'var(--muted)' }}>Full Name</div>
                <div>{seller.profile.full_name || '—'}</div>
                <div style={{ color: 'var(--muted)' }}>User Email</div>
                <div>{seller.profile.email || '—'}</div>
                <div style={{ color: 'var(--muted)' }}>System Role</div>
                <div><code>{seller.profile.role || 'customer'}</code></div>
              </div>
            </div>
          )}

          {/* Payout Details */}
          {seller.payout_details && Object.keys(seller.payout_details).length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <ShieldCheck size={14} color="var(--muted)" />
                <h3 style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', margin: 0 }}>
                  Settlement & Payout Details
                </h3>
              </div>
              <pre style={{ fontSize: '11px', background: 'var(--surface-subtle)', padding: '10px', borderRadius: '4px', overflowX: 'auto', margin: 0 }}>
                {JSON.stringify(seller.payout_details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Commission Negotiation & Application Decision */}
        <div className="admin-table-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <ShieldCheck size={18} color="var(--ink)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>Commission & Approval</h2>
          </div>
          
          <AdminProposalForm 
            sellerId={seller.id} 
            status={seller.seller_status}
            currentCommission={Number(seller.commission_rate ?? 15)}
            activeProposal={activeProposal} 
          />
          
          {/* Negotiation History */}
          {proposals.length > 0 && (
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: '16px' }}>
                Negotiation History ({proposals.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {proposals.map((p: any) => (
                  <div key={p.id} style={{ fontSize: '12px', padding: '12px', background: 'var(--surface-subtle)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600 }}>SENO Proposed: {p.proposed_rate}%</span>
                      <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    {p.admin_message && <div style={{ color: 'var(--muted)', fontStyle: 'italic', marginBottom: '8px' }}>"{p.admin_message}"</div>}
                    
                    {p.seller_requested_rate && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#b91c1c' }}>Seller Requested: {p.seller_requested_rate}%</span>
                          {p.responded_at && <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{new Date(p.responded_at).toLocaleDateString()}</span>}
                        </div>
                        {p.seller_request_reason && <div style={{ color: 'var(--muted)' }}>"{p.seller_request_reason}"</div>}
                      </div>
                    )}
                    
                    <div style={{ marginTop: '8px', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px', color: p.status === 'accepted' ? '#166534' : 'var(--muted)' }}>
                      Status: {p.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
