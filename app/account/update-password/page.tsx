'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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
      }, 3000)
    }
  }

  if (success) {
    return (
      <main className="static-page-container">
        <span className="section-kicker">PASSWORD RECOVERY</span>
        <h1 className="static-page-title">Password Updated</h1>
        <p className="static-intro-lead" style={{ textAlign: 'center' }}>
          Your password has been successfully updated. Redirecting to your account...
        </p>
      </main>
    )
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">PASSWORD RECOVERY</span>
      <h1 className="static-page-title">Set New Password</h1>
      <p className="static-intro-lead">
        Enter your new password below.
      </p>

      {error && (
        <div style={{ color: 'red', fontSize: '12px', marginBottom: '16px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="form-stack">
        <input
          type="password"
          placeholder="New Password"
          className="form-input-field"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }} disabled={loading}>
          {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
        </button>
      </form>
    </main>
  )
}
