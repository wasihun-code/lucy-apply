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

interface ApplicationItem {
  id: string
  applicant: string
  applicant_name: string
  program: string
  program_name: string
  status: string
  submitted_at: string | null
  document_verified_count: number
  document_total_count: number
}

interface ProgramItem {
  id: string
  name: string
}

interface MeResponse {
  role: string
  university?: string
  permission_level?: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  admitted: 'Admitted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  accepted: 'Accepted',
  declined: 'Declined',
}

const STATUS_OPTIONS = ['', 'submitted', 'under_review', 'admitted', 'rejected', 'waitlisted', 'accepted', 'declined']

export default function ApplicationsPage() {
  const router = useRouter()
  const [apps, setApps] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')

  const fetchApps = useCallback(() => {
    if (!me?.university) return
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (programFilter) params.set('program', programFilter)
    setLoading(true)
    authFetch<{ results: ApplicationItem[] }>(
      `universities/${me.university}/applications/?${params.toString()}`
    ).then((data) => {
      setApps(data.results || [])
    }).catch(() => {
      setApps([])
    }).finally(() => setLoading(false))
  }, [me, statusFilter, programFilter])

  useEffect(() => {
    const token = getToken()
    if (!token) { router.push('/login'); return }
    authFetch<MeResponse>('auth/me/').then((m) => {
      setMe(m)
      if (m.role !== 'universitystaff') { router.push('/dashboard'); return }
      if (!m.university) return
      authFetch<{ results: ProgramItem[] }>(
        `universities/${m.university}/programs/`
      ).then((data) => {
        setPrograms(data.results || [])
      }).catch(() => {})
    }).catch(() => {
      router.push('/login')
    })
  }, [router])

  useEffect(() => {
    if (me?.university) fetchApps()
  }, [me, fetchApps])

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      draft: '#6c757d',
      submitted: '#0d6efd',
      under_review: '#ffc107',
      admitted: '#198754',
      rejected: '#dc3545',
      waitlisted: '#fd7e14',
      accepted: '#198754',
      declined: '#6c757d',
    }
    return (
      <span style={{
        fontSize: '0.75rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        background: colors[status] || '#e9ecef',
        color: ['under_review'].includes(status) ? '#000' : '#fff',
        fontWeight: 600,
      }}>
        {STATUS_LABELS[status] || status}
      </span>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Applications</h2>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
          ))}
        </select>
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">All programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? <p>Loading applications...</p> : apps.length === 0 ? (
        <p style={{ color: '#666' }}>No applications found.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '900px' }}>
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/portal/applications/${app.id}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ flex: 2 }}>
                <strong>{app.applicant_name}</strong>
                <br />
                <span style={{ fontSize: '0.8rem', color: '#666' }}>{app.program_name}</span>
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem', color: '#666' }}>
                {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '0.85rem' }}>
                {app.document_verified_count}/{app.document_total_count} verified
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                {statusBadge(app.status)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
