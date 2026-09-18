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
        <div style={{ padding: '14px 16px', background: '#fef2f2', color: '#991b1b', fontSize: '13px', border: '1px solid #fecaca', borderRadius: '2px' }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="store_name" className="form-label">
          Store Name <span className="form-label-required">*</span>
        </label>
        <input
          type="text"
          id="store_name"
          name="store_name"
          required
          className="input-field"
          placeholder="e.g. Atelier Studio Mumbai"
        />
        <div className="form-helper-text">Your public merchant and storefront brand name.</div>
      </div>

      <div>
        <label htmlFor="slug" className="form-label">
          Store URL Slug <span className="form-label-required">*</span>
        </label>
        <input
          type="text"
          id="slug"
          name="slug"
          required
          pattern="[a-z0-9-]+"
          className="input-field"
          placeholder="e.g. atelier-studio-mumbai"
          style={{ fontFamily: 'monospace' }}
        />
        <div className="form-helper-text">
          Only lowercase letters, numbers, and hyphens (e.g. <code>senostore.com/sellers/your-slug</code>).
        </div>
      </div>

      <div>
        <label htmlFor="contact_email" className="form-label">
          Contact Email <span className="form-label-required">*</span>
        </label>
        <input
          type="email"
          id="contact_email"
          name="contact_email"
          required
          className="input-field"
          placeholder="e.g. contact@atelierstudio.com"
        />
        <div className="form-helper-text">Used for consignment dispatch alerts and commission reports.</div>
      </div>

      <div>
        <label htmlFor="contact_phone" className="form-label">
          Contact Phone
        </label>
        <input
          type="tel"
          id="contact_phone"
          name="contact_phone"
          className="input-field"
          placeholder="e.g. +91 98765 43210"
        />
        <div className="form-helper-text">Logistics courier escalation contact.</div>
      </div>

      <div>
        <label htmlFor="description" className="form-label">
          Store & Brand Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="input-field"
          placeholder="Tell us about your brand heritage, design aesthetic, fabric provenance, and catalog assortment..."
        />
        <div className="form-helper-text">Summary of your brand craft notes for the SENO onboarding committee.</div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="button button-primary"
        style={{ padding: '15px', fontSize: '12px', marginTop: '10px', width: '100%', justifyContent: 'center' }}
      >
        {loading ? 'Submitting Application...' : 'Submit Seller Application'}
      </button>
    </form>
  )
}
