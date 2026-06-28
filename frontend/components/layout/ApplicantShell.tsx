'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getMe, type AuthUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Menu, X, LogOut } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'My Applications' },
  { href: '/universities', label: 'Browse Programs' },
  { href: '/dashboard/profile', label: 'Profile' },
]

export function ApplicantShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    getMe().then((u) => {
      if (!u) {
        router.push('/login')
        return
      }
      setUser(u)
    })
  }, [router])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse bg-border rounded h-4 w-32" />
      </div>
    )
  }

  async function handleLogout() {
    await fetch('/api/auth/logout/', { method: 'POST' })
    router.push('/')
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href="/dashboard" className="font-display font-bold text-text-900 text-lg">
          Lucy Apply
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 rounded text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-primary-soft text-primary'
                : 'text-text-600 hover:bg-background hover:text-text-900',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-sm font-medium text-text-900 truncate">{user.full_name}</p>
        <p className="text-xs text-text-400 truncate">{user.email}</p>
        <button
          onClick={handleLogout}
          className="mt-2 flex items-center gap-1.5 text-xs text-text-400 hover:text-danger transition-colors"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 bg-surface border-r border-border">
        {sidebar}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-surface border-r border-border transform transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebar}
      </aside>

      {/* Top bar (mobile only) */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-surface border-b border-border h-14 flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 text-text-600 hover:text-text-900"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <span className="ml-3 font-display font-bold text-text-900">Lucy Apply</span>
      </div>

      {/* Content area */}
      <div className="flex-1 lg:ml-60 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}
