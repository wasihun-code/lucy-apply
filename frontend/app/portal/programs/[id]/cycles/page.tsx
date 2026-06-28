'use client'

import { useCallback, useEffect, useState, FormEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'

interface Cycle {
  id: string
  name: string
  open_date: string
  close_date: string
  status: string
}

interface MeResponse {
  role: string
  permission_level?: string
}

export default function CyclesPage() {
  const router = useRouter()
  const params = useParams()
  const programId = params?.id as string

  const [me, setMe] = useState<MeResponse | null>(null)
  const [programName, setProgramName] = useState('')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOpenDate, setNewOpenDate] = useState('')
  const [newCloseDate, setNewCloseDate] = useState('')
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async () => {
    if (!programId) return
    try {
      const m = await getMe()
      if (!m) { router.push('/portal/programs'); return }
      setMe(m as MeResponse)
      if (m.role !== 'universitystaff') { router.push('/portal/programs'); return }

      const [progRes, cycRes] = await Promise.all([
        fetch(`/api/proxy/programs/${programId}/`),
        fetch(`/api/proxy/programs/${programId}/cycles/`),
      ])
      if (!progRes.ok || !cycRes.ok) throw new Error('Failed to load')
      const prog = await progRes.json() as { name: string }
      const cyc = await cycRes.json() as Cycle[]
      setProgramName(prog.name)
      setCycles(Array.isArray(cyc) ? cyc : (cyc as unknown as { results: Cycle[] }).results || [])
    } catch {
      router.push('/portal/programs')
    } finally {
      setLoading(false)
    }
  }, [programId, router])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreateCycle(e: FormEvent) {
    e.preventDefault()
    if (!programId || creating) return
    setCreating(true)
    setError(null)

    try {
      const res = await fetch(`/api/proxy/programs/${programId}/cycles/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          open_date: newOpenDate,
          close_date: newCloseDate,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setShowNewForm(false)
      setNewName('')
      setNewOpenDate('')
      setNewCloseDate('')
      setSuccess('Cycle created successfully.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create cycle')
    } finally {
      setCreating(false)
    }
  }

  async function handleClose(cycleId: string) {
    if (!confirm('Close this cycle? New applications will be blocked.')) return
    try {
      const res = await fetch(`/api/proxy/admission-cycles/${cycleId}/close/`, { method: 'PATCH' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setSuccess('Cycle closed.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to close cycle')
    }
  }

  async function handleArchive(cycleId: string) {
    if (!confirm('Archive this cycle? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/proxy/admission-cycles/${cycleId}/archive/`, { method: 'PATCH' })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      setSuccess('Cycle archived.')
      await loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive cycle')
    }
  }

  const isAdmin = me?.permission_level === 'admin'

  if (loading) return <p>Loading cycles...</p>

  return (
    <div>
      <Link href="/portal/programs" style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>
        &larr; Back to Programs
      </Link>
      <h2 style={{ marginBottom: '1rem' }}>Admission Cycles — {programName}</h2>

      {error && (
        <div style={{ color: '#dc3545', marginBottom: '1rem', padding: '0.5rem', background: '#f8d7da', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: '#0f5132', marginBottom: '1rem', padding: '0.5rem', background: '#d1e7dd', borderRadius: '4px' }}>
          {success}
        </div>
      )}

      {isAdmin && !showNewForm && (
        <button
          onClick={() => setShowNewForm(true)}
          style={{
            padding: '0.5rem 1rem',
            background: '#198754',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.9rem',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          + New Admission Cycle
        </button>
      )}

      {showNewForm && isAdmin && (
        <form onSubmit={handleCreateCycle} style={{ maxWidth: '500px', marginBottom: '2rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 1rem' }}>New Admission Cycle</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Cycle Name *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g. Fall 2027"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Open Date *</label>
              <input
                type="datetime-local"
                value={newOpenDate}
                onChange={(e) => setNewOpenDate(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Close Date *</label>
              <input
                type="datetime-local"
                value={newCloseDate}
                onChange={(e) => setNewCloseDate(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: '0.5rem 1rem',
                  background: creating ? '#6c757d' : '#0d6efd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                }}
              >
                {creating ? 'Creating...' : 'Create Cycle'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {cycles.length === 0 ? (
        <p style={{ color: '#666' }}>No admission cycles yet for this program.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '600px' }}>
          {cycles.map((c) => (
            <div
              key={c.id}
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
                <strong>{c.name}</strong>
                <br />
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {new Date(c.open_date).toLocaleDateString()} &ndash; {new Date(c.close_date).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: cycleStatusBg(c.status),
                    color: cycleStatusColor(c.status),
                    fontWeight: 600,
                  }}
                >
                  {c.status}
                </span>
                {isAdmin && c.status === 'open' && (
                  <button
                    onClick={() => handleClose(c.id)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: '#ffc107',
                      color: '#333',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Close Early
                  </button>
                )}
                {isAdmin && c.status === 'closed' && (
                  <button
                    onClick={() => handleArchive(c.id)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function cycleStatusBg(status: string): string {
  switch (status) {
    case 'scheduled': return '#e9ecef'
    case 'open': return '#d1e7dd'
    case 'closed': return '#f8d7da'
    case 'archived': return '#e9ecef'
    default: return '#e9ecef'
  }
}

function cycleStatusColor(status: string): string {
  switch (status) {
    case 'scheduled': return '#666'
    case 'open': return '#0f5132'
    case 'closed': return '#842029'
    case 'archived': return '#666'
    default: return '#666'
  }
}