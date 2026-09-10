'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { catalog } from '@/lib/catalog'
import { ProductCard } from '@/components/ProductCard'

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''
  const [query, setQuery] = useState(initialQuery)

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  const results = query.trim()
    ? catalog.filter(
        p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      )
    : []

  return (
    <main className="static-page-container">
      <span className="section-kicker">CATALOG SEARCH</span>
      <h1 className="static-page-title">Search</h1>

      <form onSubmit={e => e.preventDefault()} className="search-form-input-group" style={{ maxWidth: '600px', marginBottom: '40px' }}>
        <Search size={24} />
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </form>

      {query.trim() === '' ? (
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Enter a term above to search through our contemporary fashion catalog.
        </p>
      ) : results.length > 0 ? (
        <div>
          <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '32px' }}>
            Found {results.length} {results.length === 1 ? 'result' : 'results'} for &quot;{query}&quot;
          </p>
          <div className="product-grid columns-4">
            {results.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ borderTop: '1px solid var(--line)', padding: '70px 0', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, margin: '0 0 10px' }}>
            NO RESULTS
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
            Try another search query or browse our latest releases.
          </p>
          <Link href="/collections/all" className="dark-btn" style={{ padding: '14px 28px' }}>
            BROWSE ALL PRODUCTS
          </Link>
        </div>
      )}
    </main>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="static-page-container">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  )
}
