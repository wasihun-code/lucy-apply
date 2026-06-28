'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function MFAVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/proxy/auth/mfa/verify/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/dashboard'
        router.push(redirect)
      } else {
        setError(data.error?.message || 'Invalid code')
      }
    } catch {
      setError('Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>Two-Factor Authentication</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Enter the 6-digit code from your authenticator app.
      </p>

      {error && (
        <p style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#fee2e2', borderRadius: '4px' }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          required
          maxLength={6}
          style={{
            width: '100%', padding: '0.75rem', fontSize: '1.5rem', textAlign: 'center',
            letterSpacing: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px',
            marginBottom: '1rem',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '0.75rem', background: loading ? '#94a3b8' : '#2563eb',
            color: '#fff', border: 'none', borderRadius: '4px', fontSize: '1rem',
            fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
    </div>
  )
}

export default function MFAVerifyPage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>}>
      <MFAVerifyForm />
    </Suspense>
  )
}
