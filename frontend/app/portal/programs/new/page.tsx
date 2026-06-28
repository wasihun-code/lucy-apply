'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'

export default function NewProgramPage() {
  const router = useRouter()
  const [universityId, setUniversityId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [degreeLevel, setDegreeLevel] = useState('undergraduate')
  const [description, setDescription] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [feeCurrency, setFeeCurrency] = useState('USD')

  useEffect(() => {
    getMe().then((m) => {
      if (!m || m.role !== 'universitystaff' || m.permission_level !== 'admin' || !m.university) {
        router.push('/portal/programs')
        return
      }
      setUniversityId(m.university!)
    })
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!universityId || saving) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/proxy/universities/${universityId}/programs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          degree_level: degreeLevel,
          description,
          fee_amount: feeAmount,
          fee_currency: feeCurrency,
          required_documents: [],
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        const msg = text.length > 200 ? `HTTP ${res.status}` : text || `HTTP ${res.status}`
        throw new Error(msg)
      }
      router.push('/portal/programs')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create program')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Link href="/portal/programs" style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>
        &larr; Back to Programs
      </Link>
      <h2>Create Program</h2>

      {error && (
        <div style={{ color: '#dc3545', marginBottom: '1rem', padding: '0.5rem', background: '#f8d7da', borderRadius: '4px' }}>
          {error}
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
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '0.6rem 1.5rem',
            background: saving ? '#6c757d' : '#198754',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {saving ? 'Creating...' : 'Create Program'}
        </button>
      </form>
    </div>
  )
}