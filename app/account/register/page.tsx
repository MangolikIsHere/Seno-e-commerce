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

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    })

    if (signInError) {
      setError(signInError.message)
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
      <main style={{ width: '100%', maxWidth: '400px', margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span className="section-kicker" style={{ display: 'block', marginBottom: '8px' }}>SENO ACCOUNT</span>
          <h1 className="static-page-title" style={{ fontSize: '28px', marginBottom: '8px', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Check Your Email</h1>
          <p className="static-intro-lead" style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--muted)', margin: 0 }}>
            We&apos;ve sent a confirmation link to {email}. Please verify your email to continue.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending || resendCooldown > 0}
            className="outline-btn"
            style={{
              padding: '14px',
              fontSize: '11px',
              letterSpacing: '1px',
              width: '100%',
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
              margin: '0'
            }}>
              {resendStatus}
            </p>
          )}
          <Link href="/account" className="dark-btn" style={{ padding: '14px', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none', width: '100%', textAlign: 'center', display: 'block' }}>
            RETURN TO SIGN IN
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main style={{ width: '100%', maxWidth: '400px', margin: '0 auto', padding: '40px 16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span className="section-kicker" style={{ display: 'block', marginBottom: '8px' }}>SENO ACCOUNT</span>
        <h1 className="static-page-title" style={{ fontSize: '28px', marginBottom: '8px', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>Create Account</h1>
        <p className="static-intro-lead" style={{ fontSize: '13px', lineHeight: '1.4', color: 'var(--muted)', margin: 0 }}>
          Create an account to track shipments, store delivery preferences, and save items to your wishlist.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px', padding: '10px 12px', borderRadius: '4px', marginBottom: '24px', textAlign: 'center', lineHeight: '1.4' }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="outline-btn"
          style={{ padding: '14px', fontSize: '11px', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            <path d="M1 1h22v22H1z" fill="none"/>
          </svg>
          CONTINUE WITH GOOGLE
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border, #e5e7eb)' }} />
          <span style={{ padding: '0 12px', fontSize: '10px', color: 'var(--muted, #6b7280)', letterSpacing: '1px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border, #e5e7eb)' }} />
        </div>

        <form onSubmit={handleRegister} className="form-stack" style={{ gap: '12px' }}>
          <input
            type="text"
            placeholder="First name"
            className="form-input-field"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <input
            type="text"
            placeholder="Last name"
            className="form-input-field"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <input
            type="email"
            placeholder="Email address"
            className="form-input-field"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%' }}
          />
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="form-input-field"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ paddingRight: '40px', width: '100%' }}
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

          <button type="submit" className="dark-btn" style={{ padding: '14px', fontSize: '11px', letterSpacing: '1px', width: '100%', marginTop: '4px' }} disabled={loading}>
            {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
          </button>

          <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link href="/account" style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'underline' }}>
              Sign In
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}
