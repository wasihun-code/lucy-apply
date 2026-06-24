'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Application } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

function apiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function getToken(): string | null {
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1] ?? null
  )
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    const msg = text.length > 200 ? `HTTP ${res.status}` : text || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

export default function ConfirmationPage() {
  const params = useParams()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
      return
    }

    async function load() {
      try {
        const app = await authFetch<Application>(`applications/${params.id}/`)
        setApplication(app)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  if (loading) {
    return <p>Loading...</p>
  }

  if (!application) {
    return (
      <div>
        <h1>Application not found</h1>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: '2rem' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
      <h1 style={{ marginBottom: '0.5rem' }}>Application Submitted</h1>
      <p style={{ color: '#666', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
        Your application to <strong>{application.program_name}</strong> has been received.
      </p>
      <p style={{ color: '#666' }}>
        You will receive a confirmation email once the university reviews your application.
      </p>

      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'left',
        }}
      >
        <h3 style={{ margin: '0 0 1rem' }}>Application Details</h3>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Status:</strong>{' '}
          <span style={{ textTransform: 'capitalize' }}>{application.status.replace('_', ' ')}</span>
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Program:</strong> {application.program_name}
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>University:</strong> {application.university_name}
        </p>
        <p style={{ margin: '0.25rem 0' }}>
          <strong>Submitted:</strong>{' '}
          {new Date(application.updated_at).toLocaleString()}
        </p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.5rem',
            background: '#0d6efd',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '1rem',
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
