import React from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FileText, 
  Layers, 
  Image as ImageIcon, 
  Tag, 
  DollarSign, 
  Boxes, 
  Truck, 
  Info,
  ChevronRight
} from 'lucide-react'
import { getMySellerRecord, getSellerProductRevisionDetails } from '@/lib/sellers'
import { AFFECTED_FIELDS, AffectedFieldKey } from '@/lib/revisionFeedback'
import { money } from '@/lib/catalog'
import { SenoImage } from '@/components/SenoImage'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

const FIELD_ICONS: Record<AffectedFieldKey, React.ComponentType<{ size?: number; color?: string; className?: string }>> = {
  title_description: FileText,
  images: ImageIcon,
  category: Tag,
  pricing: DollarSign,
  variants: Layers,
  inventory: Boxes,
  shipping_logistics: Truck
}

export default async function SellerProductRevisionsPage({ params }: Props) {
  const { id } = await params
  const seller = await getMySellerRecord()
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const details = await getSellerProductRevisionDetails(id)
  if (!details || !details.product) {
    notFound()
  }

  const { product, feedback, history } = details
  const primaryImg = (product.product_images || []).find((img: any) => img.is_primary)?.url || (product.product_images || [])[0]?.url

  return (
    <main className="static-page-container" style={{ maxWidth: '880px', paddingBottom: '96px', paddingTop: '20px' }}>
      {/* Top Header & Breadcrumbs */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Link 
            href="/seller/dashboard" 
            className="button button-outline" 
            style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>Dashboard</span>
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>/</span>
          <Link href="/seller/products" style={{ color: 'var(--muted)', fontSize: '12px', textDecoration: 'none' }}>
            Products
          </Link>
          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>/</span>
          <span style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </span>
        </div>

        <span className="section-kicker">SELLER STUDIO / REVISION FEEDBACK</span>
        <h1 className="static-page-title" style={{ fontSize: 'clamp(22px, 3.5vw, 28px)', margin: '4px 0 8px' }}>
          Product Revision Instructions
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13.5px', margin: 0 }}>
          Review the specific changes requested by SENO administration before updating your product details.
        </p>
      </div>

      {/* Product Summary Header Card */}
      <div 
        className="admin-table-card" 
        style={{ 
          padding: '16px 20px', 
          marginBottom: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div style={{ width: '56px', height: '68px', borderRadius: '4px', overflow: 'hidden', background: 'var(--surface-subtle)', flexShrink: 0, border: '1px solid var(--border)' }}>
            {primaryImg ? (
              <SenoImage src={primaryImg} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                <ImageIcon size={20} />
              </div>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px' }}>
              {product.name}
            </h2>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Category: <strong style={{ color: 'var(--ink)' }}>{(Array.isArray(product.categories) ? product.categories[0]?.name : (product.categories as any)?.name) || 'Uncategorized'}</strong></span>
              <span>&bull;</span>
              <span>Price: <strong style={{ color: 'var(--ink)' }}>{money(Number(product.price))}</strong></span>
            </div>
          </div>
        </div>

        <div>
          <span className={`status-pill ${product.approval_status === 'approved' ? 'approved' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}>
            {product.approval_status === 'rejected' ? 'Changes Requested' : product.approval_status}
          </span>
        </div>
      </div>

      {/* Main Admin Feedback Card */}
      <div 
        className="admin-table-card" 
        style={{ 
          padding: '28px', 
          marginBottom: '24px', 
          borderLeft: '4px solid #b91c1c' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} color="#b91c1c" />
          </div>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
              Required Corrections from SENO Admin
            </h2>
            {feedback?.requested_at && (
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Requested on {new Date(feedback.requested_at).toLocaleDateString(undefined, { dateStyle: 'medium' })} at {new Date(feedback.requested_at).toLocaleTimeString(undefined, { timeStyle: 'short' })}
              </span>
            )}
          </div>
        </div>

        {/* Exact Instructions Box */}
        <div style={{ background: '#fcfcfc', border: '1px solid var(--border)', borderRadius: '6px', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '8px' }}>
            Exact Instructions:
          </div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
            {feedback?.instructions || product.rejection_reason || 'Please review your product details and resubmit for approval.'}
          </p>
        </div>

        {/* Specific Affected Sections (if any) */}
        {feedback?.affected_fields && feedback.affected_fields.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>
              Specific Sections Requiring Changes:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
              {feedback.affected_fields.map((key: AffectedFieldKey) => {
                const config = AFFECTED_FIELDS[key]
                if (!config) return null
                const IconComponent = FIELD_ICONS[key] || FileText
                return (
                  <Link
                    key={key}
                    href={`/seller/products/${product.id}/edit?step=${config.step}&focus=${config.key}#${config.anchor}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      borderRadius: '6px',
                      border: '1px solid #fed7aa',
                      background: '#fffaf5',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    className="affected-field-action-card"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={15} color="#c2410c" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#9a3412' }}>{config.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Step {config.step} in Editor</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span>Fix</span>
                      <ChevronRight size={13} />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Additional Admin Notes (if present) */}
        {feedback?.additional_notes && (
          <div style={{ padding: '14px 16px', background: 'var(--surface-subtle)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <Info size={16} color="var(--muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '12px', color: 'var(--ink)' }}>Additional Notes & Reference:</strong>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                {feedback.additional_notes}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Historical Revision Log (if previous revisions exist) */}
      {history && history.length > 1 && (
        <div className="admin-table-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', margin: '0 0 16px' }}>
            Previous Revision History ({history.length - 1})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.slice(0, history.length - 1).reverse().map((h: any, idx: number) => (
              <div 
                key={h.id || idx} 
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '4px', 
                  background: 'var(--surface-subtle)', 
                  border: '1px solid var(--border)', 
                  fontSize: '12.5px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--muted)', fontSize: '11px' }}>
                  <span>Requested: {h.requested_at ? new Date(h.requested_at).toLocaleDateString() : 'Previous'}</span>
                  {h.resubmitted_at && <span style={{ color: '#166534', fontWeight: 500 }}>Resubmitted: {new Date(h.resubmitted_at).toLocaleDateString()}</span>}
                </div>
                <p style={{ margin: 0, color: 'var(--ink)' }}>
                  "{h.instructions}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '12px', 
          flexWrap: 'wrap',
          padding: '20px 0',
          borderTop: '1px solid var(--border)' 
        }}
      >
        <Link 
          href="/seller/dashboard" 
          className="button button-outline" 
          style={{ padding: '10px 20px', fontSize: '12px' }}
        >
          <ArrowLeft size={13} />
          <span>Back to Dashboard</span>
        </Link>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link 
            href="/seller/products" 
            className="button button-outline" 
            style={{ padding: '10px 18px', fontSize: '12px' }}
          >
            All Products
          </Link>
          <Link 
            href={`/seller/products/${product.id}/edit`} 
            className="button button-primary" 
            style={{ padding: '10px 24px', fontSize: '12px', gap: '6px', background: 'var(--ink)' }}
          >
            <Edit3 size={14} />
            <span>Edit Product & Address Feedback</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
