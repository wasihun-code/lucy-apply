'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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

interface StaffInfo {
  isStaff: boolean
  isAdmin: boolean
  universityId: string | null
  universityName: string
}

async function checkStaff(): Promise<StaffInfo> {
  const token = getToken()
  if (!token) return { isStaff: false, isAdmin: false, universityId: null, universityName: '' }
  try {
    const data = await authFetch<{
      role: string
      permission_level?: string
      university?: string
      university_name?: string
    }>('auth/me/')
    if (data.role === 'universitystaff') {
      return {
        isStaff: true,
        isAdmin: data.permission_level === 'admin',
        universityId: data.university || null,
        universityName: data.university_name || '',
      }
    }
    return { isStaff: false, isAdmin: false, universityId: null, universityName: '' }
  } catch {
    return { isStaff: false, isAdmin: false, universityId: null, universityName: '' }
  }
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [staff, setStaff] = useState<StaffInfo | null>(null)

  useEffect(() => {
    checkStaff().then((s) => {
      if (!s.isStaff) {
        router.push('/dashboard')
        return
      }
      setStaff(s)
    })
  }, [router])

  if (!staff) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Verifying access...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'baseline' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>
          University Portal{staff.universityName ? ` — ${staff.universityName}` : ''}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
          <Link
            href="/portal/programs"
            style={{
              padding: '0.4rem 0.8rem',
              background: pathname.startsWith('/portal/programs') ? '#0d6efd' : '#e9ecef',
              color: pathname.startsWith('/portal/programs') ? '#fff' : '#333',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            Programs
          </Link>
          <Link
            href="/dashboard"
            style={{
              padding: '0.4rem 0.8rem',
              background: '#6c757d',
              color: '#fff',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            Applicant Dashboard
          </Link>
        </div>
      </div>
      {children}
    </div>
  )
}