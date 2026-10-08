'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { AccountShell } from '@/components/account/AccountShell'
import { Shield, Key, CheckCircle2, UserCheck } from 'lucide-react'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { profile, user } = useAuth()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/account')
      }, 2500)
    }
  }

  return (
    <AccountShell title="Account Security" subtitle="Personal details, authentication, and credentials">
      <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Personal Details Card */}
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h2 className="admin-card-heading" style={{ marginBottom: '4px' }}>Profile Information</h2>
          <p className="admin-card-subheading" style={{ marginBottom: '16px' }}>Your registered client identity</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', display: 'block', marginBottom: '2px' }}>
                Full Name
              </span>
              <strong style={{ fontSize: '14px' }}>{profile?.full_name || 'Valued Client'}</strong>
            </div>

            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', display: 'block', marginBottom: '2px' }}>
                Email Address
              </span>
              <span>{user?.email || profile?.email || '—'}</span>
            </div>

            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', display: 'block', marginBottom: '2px' }}>
                Client Privilege Status
              </span>
              <span className="status-pill approved" style={{ marginTop: '2px', display: 'inline-flex' }}>
                Authenticated Client
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="admin-table-card" style={{ padding: '28px' }}>
          <h2 className="admin-card-heading" style={{ marginBottom: '4px' }}>Update Password</h2>
          <p className="admin-card-subheading" style={{ marginBottom: '20px' }}>Set a new secure access passphrase</p>

          {success ? (
            <div style={{ padding: '16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '2px', color: '#065f46', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>Password successfully updated. Redirecting to your account...</span>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="form-stack">
              {error && (
                <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '12px' }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  className="form-input-field"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  className="form-input-field"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="button button-primary"
                style={{ padding: '12px 24px', fontSize: '12px' }}
                disabled={loading}
              >
                {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </AccountShell>
  )
}
