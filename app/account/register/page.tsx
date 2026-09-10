'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Account registration will be connected to Supabase backend in a future phase.')
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">SENO ACCOUNT</span>
      <h1 className="static-page-title">Create Account</h1>
      <p className="static-intro-lead">
        Create an account to track shipments, store delivery preferences, and save items to your wishlist.
      </p>

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

        <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }}>
          CREATE ACCOUNT
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
