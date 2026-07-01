'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getMe, type AuthUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ApplicantShell } from '@/components/layout/ApplicantShell'
import { StaffShell } from '@/components/layout/StaffShell'

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/mfa/setup', '/mfa/verify']

export function PublicShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const isAuthPage = AUTH_PATHS.some(p => pathname.startsWith(p))

  useEffect(() => {
    getMe().then((u) => {
      setUser(u)
      setAuthReady(true)
      if (u && pathname === '/') {
        if (u.role === 'platformadmin') router.replace('/admin/universities')
        else if (u.role === 'universitystaff') router.replace('/portal')
        else router.replace('/dashboard')
      }
    })
  }, [router, pathname])

  if (authReady && user && pathname !== '/' && !isAuthPage) {
    if (user.role === 'applicant') {
      return <ApplicantShell initialUser={user}>{children}</ApplicantShell>
    }
    return <StaffShell initialUser={user}>{children}</StaffShell>
  }
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="font-display font-bold text-text-900 text-lg">
            Lucy Apply
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/universities"
              className="text-sm font-medium text-text-600 hover:text-text-900 transition-colors"
            >
              Universities
            </Link>
            <Link
              href="/programs"
              className="text-sm font-medium text-text-600 hover:text-text-900 transition-colors"
            >
              Programs
            </Link>
            {!user ? (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">Register</Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-text-400 px-2 py-0.5 rounded-full bg-background border border-border">
                  {user.role === 'platformadmin'
                    ? 'Admin'
                    : user.role === 'universitystaff'
                    ? 'Staff'
                    : 'Applicant'}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (user.role === 'platformadmin') router.push('/admin/universities')
                    else if (user.role === 'universitystaff') router.push('/portal')
                    else router.push('/dashboard')
                  }}
                >
                  Go to Dashboard
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {children}
      </main>

      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-text-400">
          Lucy Apply
        </div>
      </footer>
    </div>
  )
}
