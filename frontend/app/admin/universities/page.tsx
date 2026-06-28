'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import type { AdminUniversity } from '@/lib/api'

export default function AdminUniversitiesPage() {
  const router = useRouter()
  const [universities, setUniversities] = useState<AdminUniversity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const me = await getMe()
        if (!me || me.role !== 'platformadmin') {
          router.push('/login')
          return
        }
        const res = await fetch('/api/proxy/admin/universities/')
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setUniversities(data.results ?? data)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) return <p>Loading universities...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Universities</h1>
        <Link
          href="/admin/universities/new"
          style={{
            padding: '0.5rem 1rem',
            background: '#0d6efd',
            color: '#fff',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          + New University
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '6px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Name</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Status</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Programs</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Applications</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Created</th>
          </tr>
        </thead>
        <tbody>
          {universities.map((u) => (
            <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem' }}>{u.name}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: u.status === 'active' ? '#d1e7dd' : '#f8d7da',
                  color: u.status === 'active' ? '#0f5132' : '#842029',
                }}>
                  {u.status}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>{u.program_count}</td>
              <td style={{ padding: '0.75rem' }}>{u.application_count}</td>
              <td style={{ padding: '0.75rem', color: '#666', fontSize: '0.85rem' }}>
                {new Date(u.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
