'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1]
    if (!token) {
      router.push('/login')
      return
    }

    fetch(`${API_URL}auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((me) => {
        if (me.role !== 'platformadmin') {
          router.push('/login')
          return
        }
        if (me.mfa_enabled && !me.mfa_verified) {
          router.push('/mfa/verify?redirect=' + encodeURIComponent(pathname))
          return
        }
        if (!me.mfa_enabled) {
          router.push('/mfa/setup')
          return
        }
        setAuthed(true)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router, pathname])

  if (!authed) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}><p>Verifying access...</p></div>
  }

  const navItems = [
    { href: '/admin/universities', label: 'Universities' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: '220px', background: '#1a1a2e', color: '#fff', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1.5rem', color: '#a0a0b8' }}>Admin Panel</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                textDecoration: 'none',
                color: pathname.startsWith(item.href) ? '#fff' : '#a0a0b8',
                background: pathname.startsWith(item.href) ? '#16213e' : 'transparent',
                fontSize: '0.9rem',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div style={{ marginTop: '2rem', borderTop: '1px solid #2a2a3e', paddingTop: '1rem' }}>
          <Link href="/" style={{ color: '#a0a0b8', textDecoration: 'none', fontSize: '0.85rem' }}>
            Back to main site
          </Link>
        </div>
      </nav>
      <main style={{ flex: 1, padding: '2rem', background: '#f5f5f5' }}>
        {children}
      </main>
    </div>
  )
}
