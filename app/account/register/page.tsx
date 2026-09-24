'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  const isSubmittingRef = useRef(false)
  const isResendingRef = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => {
      setResendCooldown(c => c - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setError(null)
    setLoading(true)

    try {
      const redirectUrl = `${window.location.origin}/auth/confirm?next=/`

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: `${firstName} ${lastName}`.trim(),
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else if (data?.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email is already registered.')
      } else {
        setSuccess(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      isSubmittingRef.current = false
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (isResendingRef.current || resendCooldown > 0) return
    isResendingRef.current = true
    setResending(true)
    setResendStatus(null)

    try {
      const redirectUrl = `${window.location.origin}/auth/confirm?next=/`
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (resendError) {
        setResendStatus(`Error: ${resendError.message}`)
      } else {
        setResendStatus('A new confirmation email has been sent. Please check your inbox.')
        setResendCooldown(30)
      }
    } catch (err: unknown) {
      setResendStatus(err instanceof Error ? err.message : 'Failed to resend confirmation email.')
    } finally {
      isResendingRef.current = false
      setResending(false)
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending || resendCooldown > 0}
            className="outline-btn"
            style={{
              padding: '14px 28px',
              fontSize: '10px',
              letterSpacing: '2px',
              cursor: (resending || resendCooldown > 0) ? 'not-allowed' : 'pointer'
            }}
          >
            {resending
              ? 'SENDING...'
              : resendCooldown > 0
              ? `RESEND EMAIL (${resendCooldown}S)`
              : 'RESEND CONFIRMATION EMAIL'}
          </button>
          {resendStatus && (
            <p style={{
              fontSize: '12px',
              color: resendStatus.startsWith('Error') ? 'red' : 'var(--ink)',
              textAlign: 'center',
              maxWidth: '400px'
            }}>
              {resendStatus}
            </p>
          )}
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
          {error === 'An account with this email is already registered.' && (
            <div style={{ marginTop: '8px' }}>
              <Link href="/account/forgot-password" style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600 }}>
                Forgot your password?
              </Link>
            </div>
          )}
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
