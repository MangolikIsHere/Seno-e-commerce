'use client'

import React from 'react'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { catalog } from '@/lib/catalog'
import { ProductCard } from '@/components/ProductCard'

export default function WishlistPage() {
  const { wishlist } = useStore()

  const wishlistedProducts = catalog.filter(p => wishlist.includes(p.slug))

  return (
    <main className="static-page-container">
      <span className="section-kicker">SAVED SILHOUETTES</span>
      <h1 className="static-page-title">Your Wishlist</h1>

      {wishlistedProducts.length === 0 ? (
        <div style={{ borderTop: '1px solid var(--line)', padding: '80px 0', textAlign: 'center' }}>
          <Heart size={44} strokeWidth={1.2} color="var(--clay)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 400, margin: '0 0 8px' }}>
            YOUR WISHLIST IS EMPTY
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
            Save pieces you love and they&apos;ll appear here.
          </p>
          <Link href="/collections/new-arrivals" className="dark-btn" style={{ padding: '14px 28px' }}>
            SHOP NEW ARRIVALS
          </Link>
        </div>
      ) : (
        <div>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '32px' }}>
            Showing {wishlistedProducts.length} saved {wishlistedProducts.length === 1 ? 'item' : 'items'}.
          </p>
          <div className="product-grid columns-4">
            {wishlistedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
