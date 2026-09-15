'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="static-page-container">
        <span className="section-kicker">SENO ACCOUNT</span>
        <h1 className="static-page-title">Check Your Email</h1>
        <p className="static-intro-lead" style={{ textAlign: 'center' }}>
          We&apos;ve sent a confirmation link to {email}. Please verify your email to continue.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
          <Link href="/account" className="dark-btn" style={{ padding: '16px 32px', fontSize: '10px', letterSpacing: '2px', textDecoration: 'none' }}>
            RETURN TO SIGN IN
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">SENO ACCOUNT</span>
      <h1 className="static-page-title">Create Account</h1>
      <p className="static-intro-lead">
        Create an account to track shipments, store delivery preferences, and save items to your wishlist.
      </p>

      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="form-stack">
        <input
          type="text"
          placeholder="First name"
          className="form-input-field"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Last name"
          className="form-input-field"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
          required
        />
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

        <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }} disabled={loading}>
          {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
        </button>

        <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/account" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
            Sign In
          </Link>
        </div>
      </form>
    </main>
  )
}
