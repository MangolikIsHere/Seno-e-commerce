'use client'

import { useState } from 'react'
import { registerSeller } from '@/lib/sellers'
import { useRouter } from 'next/navigation'

export function RegisterSellerForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      await registerSeller(formData)
      router.refresh() // Refreshes the page to show the "Pending Approval" state
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div style={{ padding: '16px', background: '#fff0f0', color: '#d00', fontSize: '13px', border: '1px solid #fcc' }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="store_name" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Store Name *
        </label>
        <input
          type="text"
          id="store_name"
          name="store_name"
          required
          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', fontSize: '14px' }}
          placeholder="e.g. My Fashion Boutique"
        />
      </div>

      <div>
        <label htmlFor="slug" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Store URL Slug *
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', fontSize: '14px' }}
          placeholder="e.g. my-fashion-boutique"
        />
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--muted)' }}>
          Only lowercase letters, numbers, and hyphens. No spaces.
        </p>
      </div>

      <div>
        <label htmlFor="contact_email" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Contact Email *
        </label>
        <input
          type="email"
          id="contact_email"
          name="contact_email"
          required
          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', fontSize: '14px' }}
        />
      </div>

      <div>
        <label htmlFor="contact_phone" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Contact Phone
        </label>
        <input
          type="tel"
          id="contact_phone"
          name="contact_phone"
          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', fontSize: '14px' }}
        />
      </div>

      <div>
        <label htmlFor="description" style={{ display: 'block', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Store Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          style={{ width: '100%', padding: '12px', border: '1px solid var(--border)', fontSize: '14px', fontFamily: 'inherit' }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="dark-btn"
        style={{ padding: '16px', fontSize: '12px', marginTop: '16px' }}
      >
        {loading ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
      </button>
    </form>
  )
}
