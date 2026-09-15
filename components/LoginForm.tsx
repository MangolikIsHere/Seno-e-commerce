'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">SENO ACCOUNT</span>
      <h1 className="static-page-title">Sign In</h1>
      <p className="static-intro-lead">
        Sign in to access your order history, saved addresses, and personal wishlist.
      </p>

      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="form-stack">
        <input
          type="email"
          placeholder="Email address"
          className="form-input-field"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="form-input-field"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-4px 0 12px' }}>
          <Link href="/account/forgot-password" style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'underline' }}>
            Forgot your password?
          </Link>
        </div>

        <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }} disabled={loading}>
          {loading ? 'SIGNING IN...' : 'SIGN IN'}
        </button>

        <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
          Don&apos;t have an account?{' '}
          <Link href="/account/register" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
            Create an Account
          </Link>
        </div>
      </form>
    </main>
  )
}
