import React from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAdminOrderById, checkIsAdmin } from '@/lib/admin'
import { PrintableReceipt } from '@/components/receipt/PrintableReceipt'
import { PrintTriggerClientButton } from '@/components/receipt/PrintTriggerClientButton'

export const metadata = {
  title: 'Order Receipt | SENO Admin',
  robots: { index: false, follow: false }
}

export default async function AdminOrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isAdmin = await checkIsAdmin()

  if (!isAdmin) {
    redirect('/account')
  }

  const order = await getAdminOrderById(id)
  if (!order) notFound()

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Top Floating Action Bar (Hidden in Print) */}
      <div
        className="no-print"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        <Link
          href={`/admin/orders/${id}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#111111',
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Order Dossier</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: '#666666' }}>
            Official A4 Print Preview
          </span>
          <PrintTriggerClientButton label="Print Document" />
        </div>
      </div>

      {/* Main Print Container */}
      <div style={{ padding: '32px 16px', display: 'flex', justifyContent: 'center' }}>
        <div
          id="seno-printable-receipt"
          style={{
            background: '#ffffff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            width: '100%',
            maxWidth: '820px'
          }}
        >
          <PrintableReceipt order={order} format="a4" audience="admin" />
        </div>
      </div>
    </div>
  )
}
