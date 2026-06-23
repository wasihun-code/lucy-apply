'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Application, PaginatedResponse } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; full_name: string } | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1]

    if (!token) {
      router.push('/login')
      return
    }

    async function loadData() {
      try {
        const [profileRes, appsRes] = await Promise.all([
          fetch(`${API_URL}applicants/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}applications/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (!profileRes.ok) throw new Error('Unauthorized')
        const profileData = await profileRes.json()
        setUser(profileData)

        if (appsRes.ok) {
          const appsData: PaginatedResponse<Application> = await appsRes.json()
          setApplications(appsData.results)
        }
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  if (loading) {
    return <p>Loading...</p>
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {user && (
        <div style={{ marginTop: '1rem' }}>
          <p><strong>Name:</strong> {user.full_name}</p>
          <p><strong>Email:</strong> {user.email}</p>
        </div>
      )}

      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>My Applications</h2>
          <Link
            href="/universities"
            style={{
              padding: '0.4rem 0.8rem',
              background: '#0d6efd',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '0.85rem',
              textDecoration: 'none',
            }}
          >
            Browse Programs
          </Link>
        </div>

        {applications.length === 0 ? (
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            You haven&apos;t started any applications yet.{' '}
            <Link href="/universities">Browse universities</Link> to get started.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '600px' }}>
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/dashboard/apply/${app.program}/?cycle=${app.admission_cycle}`}
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
                <div>
                  <strong>{app.program_name}</strong>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{app.university_name}</span>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: statusBg(app.status),
                    color: statusColor(app.status),
                  }}
                >
                  {app.status.replace('_', ' ')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function statusBg(status: string): string {
  switch (status) {
    case 'draft':
      return '#e9ecef'
    case 'submitted':
    case 'under_review':
      return '#fff3cd'
    case 'admitted':
    case 'accepted':
      return '#d1e7dd'
    case 'rejected':
    case 'declined':
      return '#f8d7da'
    default:
      return '#e9ecef'
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'draft':
      return '#666'
    case 'submitted':
    case 'under_review':
      return '#664d03'
    case 'admitted':
    case 'accepted':
      return '#0f5132'
    case 'rejected':
    case 'declined':
      return '#842029'
    default:
      return '#666'
  }
}
