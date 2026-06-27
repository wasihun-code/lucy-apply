'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

function getToken(): string | null {
  return document.cookie.split('; ').find((c) => c.startsWith('access_token='))?.split('=')[1] ?? null
}

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
    const token = getToken()
    if (!token) { router.push('/login'); return }

    try {
      const res = await fetch(`${API_URL}auth/mfa/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/admin/universities'
        router.push(redirect)
      } else {
        setError(data.error?.message || 'Invalid code')
      }
    } catch {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Two-Factor Authentication</h1>
      <p style={{ marginBottom: '1rem', color: '#555' }}>
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
          disabled={loading}
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
            width: '100%', padding: '0.75rem', background: loading ? '#93a3c4' : '#2563eb', color: '#fff',
            border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
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
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <MFAVerifyForm />
    </Suspense>
  )
}
