import React from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { PrintableReceipt } from '@/components/receipt/PrintableReceipt'
import { PrintTriggerClientButton } from '@/components/receipt/PrintTriggerClientButton'

export const metadata = {
  title: 'Official Order Receipt | SENO',
  robots: { index: false, follow: false }
}

export default async function CustomerOrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/account/orders/${id}/receipt`)
  }

  // Authoritative check: User can ONLY access their own order
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles(full_name, email, phone),
      order_items(
        *,
        products(
          product_images(url, is_primary)
        )
      )
    `)
    .eq('id', id)
    .eq('customer_id', user.id)
    .single()

  if (error || !order) {
    notFound()
  }

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
          href={`/account/orders/${id}`}
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
            Official SENO Receipt Preview
          </span>
          <PrintTriggerClientButton label="Print Document / PDF" />
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
          <PrintableReceipt order={order} format="a4" audience="customer" />
        </div>
      </div>
    </div>
  )
}
