'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { X, Search } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { catalog, money } from '@/lib/catalog'

export function SearchModal() {
  const { searchOpen, setSearchOpen } = useStore()
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!searchOpen) setQuery('')
  }, [searchOpen])

  if (!searchOpen) return null

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      setSearchOpen(false)
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const results = query.trim()
    ? catalog.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 4)
    : []

  return (
    <div className="modal-backdrop search-modal-backdrop" onClick={() => setSearchOpen(false)}>
      <div className="search-modal-box" onClick={e => e.stopPropagation()}>
        <button
          className="close-btn"
          onClick={() => setSearchOpen(false)}
          aria-label="Close search"
        >
          <X size={20} />
        </button>

        <span className="section-kicker">SEARCH SENO</span>

        <form onSubmit={handleSearchSubmit} className="search-form-input-group">
          <Search size={24} className="search-icon" />
          <input
            type="text"
            autoFocus
            placeholder="Type to search products..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </form>

        {query.trim() !== '' && (
          <div className="search-quick-results">
            {results.length > 0 ? (
              <>
                <span className="results-label">Quick Suggestions ({results.length})</span>
                <div className="quick-results-grid">
                  {results.map(p => (
                    <Link
                      href={`/products/${p.slug}`}
                      key={p.slug}
                      className="quick-result-item"
                      onClick={() => setSearchOpen(false)}
                    >
                      <img src={p.image} alt={p.name} />
                      <div>
                        <h4>{p.name}</h4>
                        <p>{p.category}</p>
                        <strong>{money(p.price)}</strong>
                      </div>
                    </Link>
                  ))}
                </div>
                <button
                  className="view-all-results-btn"
                  onClick={handleSearchSubmit}
                >
                  View all results for &quot;{query}&quot; →
                </button>
              </>
            ) : (
              <p className="no-quick-results">No products found matching &quot;{query}&quot;.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
