'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

interface ProgramDetail {
  id: string
  name: string
  degree_level: string
  description: string
  requirements: string
  fee_amount: string
  fee_currency: string
  status: string
  required_documents: { type: string; label: string }[]
}

export default function EditProgramPage() {
  const router = useRouter()
  const params = useParams()
  const programId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [name, setName] = useState('')
  const [degreeLevel, setDegreeLevel] = useState('undergraduate')
  const [description, setDescription] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [feeCurrency, setFeeCurrency] = useState('USD')
  const [status, setStatus] = useState('draft')

  useEffect(() => {
    if (!programId) return
    authFetch<{ role: string; permission_level?: string }>('auth/me/').then((m) => {
      if (m.role !== 'universitystaff' || m.permission_level !== 'admin') {
        router.push('/portal/programs')
        return
      }
      return authFetch<ProgramDetail>(`programs/${programId}/`)
    }).then((p) => {
      if (!p) return
      setName(p.name)
      setDegreeLevel(p.degree_level)
      setDescription(p.description || '')
      setFeeAmount(p.fee_amount)
      setFeeCurrency(p.fee_currency)
      setStatus(p.status)
    }).catch(() => {
      router.push('/portal/programs')
    }).finally(() => {
      setLoading(false)
    })
  }, [programId, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!programId || saving) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await authFetch(`programs/${programId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          degree_level: degreeLevel,
          description,
          fee_amount: feeAmount,
          fee_currency: feeCurrency,
        }),
      })
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update program')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!programId) return
    try {
      await authFetch(`programs/${programId}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'published' }),
      })
      setStatus('published')
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to publish')
    }
  }

  if (loading) return <p>Loading...</p>

  return (
    <div>
      <Link href="/portal/programs" style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>
        &larr; Back to Programs
      </Link>
      <h2>Edit Program</h2>

      {error && (
        <div style={{ color: '#dc3545', marginBottom: '1rem', padding: '0.5rem', background: '#f8d7da', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: '#0f5132', marginBottom: '1rem', padding: '0.5rem', background: '#d1e7dd', borderRadius: '4px' }}>
          Program updated successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Program Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Degree Level *</label>
          <select
            value={degreeLevel}
            onChange={(e) => setDegreeLevel(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
          >
            <option value="undergraduate">Undergraduate</option>
            <option value="postgraduate">Postgraduate</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Fee Amount *</label>
            <input
              type="number"
              step="0.01"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
            />
          </div>
          <div style={{ width: '120px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Currency</label>
            <select
              value={feeCurrency}
              onChange={(e) => setFeeCurrency(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
            >
              <option value="USD">USD</option>
              <option value="ETB">ETB</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.6rem 1.5rem',
              background: saving ? '#6c757d' : '#0d6efd',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {status === 'draft' && (
            <button
              type="button"
              onClick={handlePublish}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#198754',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Publish
            </button>
          )}
          <span style={{ fontSize: '0.85rem', color: '#666' }}>Status: {status}</span>
        </div>
      </form>
    </div>
  )
}