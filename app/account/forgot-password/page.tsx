'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)
    
    // Default to /account/update-password for reset callback route
    const resetUrl = `${window.location.origin}/auth/callback?next=/account/update-password`

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">PASSWORD RECOVERY</span>
      <h1 className="static-page-title">Reset Password</h1>
      <p className="static-intro-lead">
        Enter your registered email address below. We will send you instructions to reset your password.
      </p>

      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {sent ? (
        <div style={{ background: 'var(--soft)', padding: '24px', maxWidth: '440px', marginTop: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)' }}>
            Password reset instructions have been dispatched to <strong>{email}</strong>.
          </p>
          <Link href="/account" className="dark-btn" style={{ marginTop: '20px', padding: '12px 20px', display: 'inline-block' }}>
            RETURN TO SIGN IN
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-stack">
          <input
            type="email"
            placeholder="Email address"
            className="form-input-field"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }} disabled={loading}>
            {loading ? 'SENDING...' : 'SEND RESET LINK'}
          </button>

          <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
            Remembered your password?{' '}
            <Link href="/account" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
              Sign In
            </Link>
          </div>
        </form>
      )}
    </main>
  )
}
