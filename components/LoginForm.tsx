'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
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
      const next = searchParams.get('next') || searchParams.get('redirect')
      const returnUrl = (next && next.startsWith('/')) ? next : '/'
      router.push(returnUrl)
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
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="form-input-field"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ paddingRight: '40px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0'
            }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

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
