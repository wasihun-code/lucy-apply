'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'

export default function MFASetupPage() {
  const router = useRouter()
  const [provisioningUri, setProvisioningUri] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    getMe().then((me) => {
      if (!me) { router.push('/login'); return }

      fetch('/api/proxy/auth/mfa/setup/', { method: 'POST' })
        .then((r) => r.json())
        .then((data) => {
          if (data.provisioning_uri) {
            setProvisioningUri(data.provisioning_uri)
          } else {
            setError(data.error?.message || 'Failed to setup MFA')
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to setup MFA'))
        .finally(() => setLoading(false))
    })
  }, [router])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifyError('')

    const res = await fetch('/api/proxy/auth/mfa/verify/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    if (res.ok) {
      setVerified(true)
      setTimeout(() => router.push('/admin/universities'), 1500)
    } else {
      setVerifyError(data.error?.message || 'Invalid code')
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Setting up MFA...</p></div>
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}><p>Error: {error}</p></div>

  if (verified) {
    return (
      <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <h1>MFA Verified</h1>
        <p style={{ color: '#0f5132', background: '#d1e7dd', padding: '1rem', borderRadius: '4px' }}>
          MFA has been set up and verified successfully. Redirecting...
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '500px', margin: '4rem auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Set Up Two-Factor Authentication</h1>
      <p style={{ marginBottom: '1rem', color: '#555' }}>
        Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).
      </p>

      {provisioningUri && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(provisioningUri)}`}
            alt="MFA QR Code"
            style={{ border: '1px solid #ddd', borderRadius: '8px' }}
          />
          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
            Or manually enter this key in your authenticator app.
          </p>
        </div>
      )}

      <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #eee' }} />

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Verify Setup</h2>
      <p style={{ marginBottom: '1rem', color: '#555', fontSize: '0.9rem' }}>
        Enter the 6-digit code from your authenticator app to confirm setup.
      </p>

      {verifyError && (
        <p style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#fee2e2', borderRadius: '4px' }}>
          {verifyError}
        </p>
      )}

      <form onSubmit={handleVerify}>
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
          style={{
            width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Verify and Complete Setup
        </button>
      </form>
    </div>
  )
}
