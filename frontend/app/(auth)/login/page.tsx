'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

function getToken(): string | null {
  return document.cookie.split('; ').find((c) => c.startsWith('access_token='))?.split('=')[1] ?? null
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || data.detail || 'Login failed')
      }

      const meRes = await fetch(`${API_URL}auth/me/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (meRes.ok) {
        const me = await meRes.json()
        if (me.role === 'universitystaff') {
          if (me.mfa_enabled && !me.mfa_verified) {
            router.push('/mfa/verify?redirect=/portal')
            return
          }
          router.push('/portal')
          return
        }
        if (me.role === 'platformadmin') {
          if (me.mfa_enabled && !me.mfa_verified) {
            router.push('/mfa/verify?redirect=/admin/universities')
            return
          }
          router.push('/admin/')
          return
        }
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Login</h1>
      {error && (
        <p style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#fee2e2', borderRadius: '4px' }}>
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem' }}
          />
        </div>
        <button
          type="submit"
          style={{
            width: '100%', padding: '0.75rem', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Login
        </button>
      </form>
      <p style={{ marginTop: '1rem', textAlign: 'center', color: '#666' }}>
        Don&apos;t have an account? <Link href="/register">Register</Link>
      </p>
    </div>
  )
}
