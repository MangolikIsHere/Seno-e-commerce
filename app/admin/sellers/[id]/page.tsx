import { getSellerWithProposals } from '@/lib/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminProposalForm } from './AdminProposalForm'

export default async function AdminSellerDetailPage({ params }: { params: { id: string } }) {
  const { seller, proposals } = await getSellerWithProposals(params.id)

  if (!seller) {
    notFound()
  }

  const activeProposal = proposals[proposals.length - 1]

  return (
    <div>
      <div className="admin-top-bar" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link href="/admin/sellers" className="button button-outline" style={{ padding: '8px', border: 'none' }}>
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="admin-page-title">{seller.store_name}</h1>
          <p className="admin-page-subtitle">Application Status: <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{seller.seller_status}</span></p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        {/* Seller Info */}
        <div className="admin-table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--ink)' }}>Business Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', fontSize: '13px' }}>
            <div style={{ color: 'var(--muted)' }}>Store Name</div>
            <div>{seller.store_name}</div>
            
            <div style={{ color: 'var(--muted)' }}>Slug</div>
            <div>/{seller.slug}</div>
            
            <div style={{ color: 'var(--muted)' }}>Contact Email</div>
            <div>{seller.contact_email}</div>
            
            <div style={{ color: 'var(--muted)' }}>Contact Phone</div>
            <div>{seller.contact_phone || '—'}</div>
            
            <div style={{ color: 'var(--muted)' }}>Description</div>
            <div>{seller.description || '—'}</div>
          </div>
        </div>

        {/* Commission Negotiation */}
        <div className="admin-table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--ink)' }}>Commission Negotiation</h2>
          
          <AdminProposalForm 
            sellerId={seller.id} 
            status={seller.seller_status} 
            activeProposal={activeProposal} 
          />
          
          {/* History */}
          {proposals.length > 0 && (
            <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', marginBottom: '16px' }}>Negotiation History</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {proposals.map((p: any) => (
                  <div key={p.id} style={{ fontSize: '12px', padding: '12px', background: 'var(--surface-subtle)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 600 }}>SENO Proposed: {p.proposed_rate}%</span>
                      <span style={{ color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    {p.admin_message && <div style={{ color: 'var(--muted)', fontStyle: 'italic', marginBottom: '8px' }}>"{p.admin_message}"</div>}
                    
                    {p.seller_requested_rate && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#b91c1c' }}>Seller Requested: {p.seller_requested_rate}%</span>
                          {p.responded_at && <span style={{ color: 'var(--muted)' }}>{new Date(p.responded_at).toLocaleDateString()}</span>}
                        </div>
                        <div style={{ color: 'var(--muted)' }}>"{p.seller_request_reason}"</div>
                      </div>
                    )}
                    
                    <div style={{ marginTop: '8px', fontWeight: 600, textTransform: 'uppercase', fontSize: '10px' }}>
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
