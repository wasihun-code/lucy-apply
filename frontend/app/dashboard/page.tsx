'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; full_name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const token = document.cookie
        .split('; ')
        .find((c) => c.startsWith('access_token='))
        ?.split('=')[1]

      if (!token) {
        router.push('/login')
        return
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'}applicants/me/`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) throw new Error('Unauthorized')
        const data = await res.json()
        setUser(data)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
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
        <h2>My Applications</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          You haven&apos;t submitted any applications yet.{' '}
          <Link href="/universities">Browse universities</Link> to get started.
        </p>
      </section>
    </div>
  )
}
