'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import type { StaffMember } from '@/lib/api'

export default function TeamPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [universityId, setUniversityId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteLevel, setInviteLevel] = useState('officer')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    getMe().then(async (me) => {
      if (!me || !me.university) {
        router.push('/login')
        return
      }
      setUniversityId(me.university)
      setIsAdmin(me.permission_level === 'admin')
      const res = await fetch(`/api/proxy/universities/${me.university}/staff/`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStaff(data)
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [router])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!universityId) return
    setInviting(true)
    setError('')
    try {
      const res = await fetch(`/api/proxy/universities/${universityId}/staff/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          permission_level: inviteLevel,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setInviteEmail('')
      setInviteName('')
      setInviteLevel('officer')
      const updatedRes = await fetch(`/api/proxy/universities/${universityId}/staff/`)
      if (!updatedRes.ok) throw new Error(await updatedRes.text())
      const updated = await updatedRes.json()
      setStaff(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to invite staff')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove(staffId: string) {
    if (!confirm('Deactivate this staff member?')) return
    if (!universityId) return
    try {
      const res = await fetch(`/api/proxy/universities/${universityId}/staff/${staffId}/`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      const updatedRes = await fetch(`/api/proxy/universities/${universityId}/staff/`)
      if (!updatedRes.ok) throw new Error(await updatedRes.text())
      const updated = await updatedRes.json()
      setStaff(updated)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to remove staff')
    }
  }

  if (loading) return <p>Loading team...</p>
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Team Members</h2>

      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '6px', overflow: 'hidden', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Name</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Email</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Permission</th>
            <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Status</th>
            {isAdmin && <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.75rem' }}>{s.full_name}</td>
              <td style={{ padding: '0.75rem' }}>{s.email}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: s.permission_level === 'admin' ? '#cfe2ff' : '#e9ecef',
                  color: s.permission_level === 'admin' ? '#084298' : '#666',
                }}>
                  {s.permission_level}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: s.account_status === 'active' ? '#d1e7dd' : '#f8d7da',
                  color: s.account_status === 'active' ? '#0f5132' : '#842029',
                }}>
                  {s.account_status}
                </span>
              </td>
              {isAdmin && (
                <td style={{ padding: '0.75rem' }}>
                  {s.account_status === 'active' && (
                    <button
                      onClick={() => handleRemove(s.id)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {isAdmin && (
        <>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Invite Staff Member</h3>
          <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '450px' }}>
            <input
              placeholder="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              placeholder="Full Name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
              style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <select
              value={inviteLevel}
              onChange={(e) => setInviteLevel(e.target.value)}
              style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="officer">Officer</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              style={{
                padding: '0.5rem 1.5rem',
                background: inviting ? '#6c757d' : '#0d6efd',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: inviting ? 'not-allowed' : 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              {inviting ? 'Inviting...' : 'Invite Staff'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
