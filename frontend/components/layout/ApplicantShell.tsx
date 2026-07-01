'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getMe, type AuthUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Menu, LogOut, FileText, Compass, CreditCard, User, Bell } from 'lucide-react'

const NOTIFICATIONS_KEY = 'lucy_notifications_visited'

const navItems = [
  { href: '/dashboard', label: 'My Applications', icon: FileText },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/universities', label: 'Browse Programs', icon: Compass },
  { href: '/dashboard/finances', label: 'Finances', icon: CreditCard },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export function ApplicantShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/proxy/applications/')
        if (!res.ok) return
        const data = await res.json()
        const apps = data.results || []
        const lastVisited = localStorage.getItem(NOTIFICATIONS_KEY)
        const cutoff = lastVisited ? parseInt(lastVisited, 10) : 0
        const count = apps.filter((a: { status: string; created_at: string }) => {
          if (a.status === 'draft') return false
          if (!cutoff) return true
          return new Date(a.created_at).getTime() > cutoff
        }).length
        setUnreadCount(count)
      } catch {
        // silent — badge is best-effort
      }
    }
    fetchUnreadCount()
  }, [pathname])

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
              'flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-primary-soft text-primary'
                : 'text-text-600 hover:bg-background hover:text-text-900',
            )}
          >
            <item.icon size={18} />
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
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-surface border-b border-border h-14 flex items-center justify-between px-4">
        <div className="flex items-center">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-text-600 hover:text-text-900"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="ml-3 font-display font-bold text-text-900">Lucy Apply</span>
        </div>
        <Link
          href="/dashboard/notifications"
          className="relative p-2 text-text-600 hover:text-text-900 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* Content area */}
      <div className="flex-1 lg:ml-60 pt-14 lg:pt-0 flex flex-col">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-end h-14 px-6 border-b border-border bg-surface shrink-0">
          <Link
            href="/dashboard/notifications"
            className="relative p-2 text-text-600 hover:text-text-900 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
