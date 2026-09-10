'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function AccountPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Authentication will be connected to Supabase backend in a future phase.')
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">SENO ACCOUNT</span>
      <h1 className="static-page-title">Sign In</h1>
      <p className="static-intro-lead">
        Sign in to access your order history, saved addresses, and personal wishlist.
      </p>

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

        <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }}>
          SIGN IN
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
