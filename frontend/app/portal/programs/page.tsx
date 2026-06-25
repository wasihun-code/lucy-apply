'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1] ?? null
  )
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const base = API_URL.replace(/\/$/, '')
  const url = `${base}/${path.replace(/^\//, '')}`
  const res = await fetch(url, {
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

interface ProgramItem {
  id: string
  name: string
  degree_level: string
  status: string
  fee_amount: string
  fee_currency: string
  created_at: string
}

interface MeResponse {
  role: string
  university?: string
  permission_level?: string
}

export default function ProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) { router.push('/login'); return }

    authFetch<MeResponse>('auth/me/').then((m) => {
      setMe(m)
      if (m.role !== 'universitystaff') { router.push('/dashboard'); return }
      if (!m.university) { setLoading(false); return }

      return authFetch<{ results: ProgramItem[] }>(
        `universities/${m.university}/programs/`
      ).then((data) => {
        setPrograms(data.results || [])
      })
    }).catch(() => {
      router.push('/login')
    }).finally(() => {
      setLoading(false)
    })
  }, [router])

  if (loading) return <p>Loading programs...</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0 }}>Programs</h2>
        {me?.permission_level === 'admin' && (
          <Link
            href="/portal/programs/new"
            style={{
              padding: '0.5rem 1rem',
              background: '#198754',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            + New Program
          </Link>
        )}
      </div>

      {programs.length === 0 ? (
        <p style={{ color: '#666' }}>
          No programs yet. {me?.permission_level === 'admin' ? (
            <Link href="/portal/programs/new">Create your first program</Link>
          ) : ''}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '700px' }}>
          {programs.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
              }}
            >
              <div>
                <strong>{p.name}</strong>
                <br />
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {p.degree_level} &middot; {p.fee_currency} {p.fee_amount}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: p.status === 'published' ? '#d1e7dd' : p.status === 'draft' ? '#e9ecef' : '#fff3cd',
                    color: p.status === 'published' ? '#0f5132' : '#666',
                  }}
                >
                  {p.status}
                </span>
                {me?.permission_level === 'admin' && (
                  <Link
                    href={`/portal/programs/${p.id}/edit`}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: '#0d6efd',
                      color: '#fff',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '0.8rem',
                    }}
                  >
                    Edit
                  </Link>
                )}
                <Link
                  href={`/portal/programs/${p.id}/cycles`}
                  style={{
                    padding: '0.3rem 0.6rem',
                    background: '#6c757d',
                    color: '#fff',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                  }}
                >
                  Cycles
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}