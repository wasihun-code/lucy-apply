'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getMe, type AuthUser } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LogOut, Menu, ChevronLeft } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  roles: ('officer' | 'admin' | 'platformadmin')[]
}

const platformAdminNav: NavItem[] = [
  { href: '/admin/universities', label: 'Universities', roles: ['platformadmin'] },
  { href: '/admin/users', label: 'Users', roles: ['platformadmin'] },
  { href: '/admin/stats', label: 'Stats', roles: ['platformadmin'] },
  { href: '/admin/audit-log', label: 'Audit Log', roles: ['platformadmin'] },
]

const staffNav: NavItem[] = [
  { href: '/portal/applications', label: 'Applications', roles: ['officer', 'admin'] },
  { href: '/portal/programs', label: 'Programs', roles: ['officer', 'admin'] },
  { href: '/portal/team', label: 'Team', roles: ['admin'] },
]

function getNavItems(role: string, permissionLevel?: string): NavItem[] {
  if (role === 'platformadmin') return platformAdminNav

  const level = permissionLevel || 'officer'
  return staffNav.filter((item) =>
    (item.roles as string[]).includes(level),
  )
}

export function StaffShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    getMe().then((u) => {
      if (!u) {
        router.push('/login')
        return
      }
      if (u.role === 'applicant') {
        router.push('/dashboard')
        return
      }
      // Preserve MFA redirect logic from original portal layout
      if (u.mfa_enabled && !u.mfa_verified) {
        const redirect = encodeURIComponent(pathname)
        router.push(`/mfa/verify?redirect=${redirect}`)
        return
      }
      setUser(u)
    })
  }, [router, pathname])

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

  const navItems = getNavItems(user.role, user.permission_level)

  async function handleLogout() {
    await fetch('/api/auth/logout/', { method: 'POST' })
    router.push('/')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* University context header */}
      <div className={cn('p-4 border-b border-border', collapsed && 'p-3')}>
        <div className="flex items-center justify-between">
          <div className={cn('min-w-0', collapsed && 'hidden')}>
            <p className="text-xs font-medium text-text-400 uppercase tracking-wider">
              {user.role === 'platformadmin' ? 'Platform Admin' : (user.university_name || 'Staff Portal')}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 rounded text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-primary-soft text-primary'
                : 'text-text-600 hover:bg-background hover:text-text-900',
            )}
          >
            {collapsed ? (
              <span className="mx-auto text-xs">{item.label.charAt(0)}</span>
            ) : (
              item.label
            )}
          </Link>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-8 mx-2 mb-2 rounded text-text-400 hover:text-text-600 hover:bg-background transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeft
          size={16}
          className={cn('transition-transform', collapsed && 'rotate-180')}
        />
      </button>

      {/* User info + logout */}
      <div className="p-4 border-t border-border">
        <p className={cn('text-sm font-medium text-text-900 truncate', collapsed && 'hidden')}>
          {user.full_name}
        </p>
        <p className={cn('text-xs text-text-400 truncate', collapsed && 'hidden')}>
          {user.email}
        </p>
        <div className={cn('flex items-center mt-2', collapsed && 'justify-center')}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-text-400 hover:text-danger transition-colors"
          >
            <LogOut size={14} />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-surface border-r border-border transition-all duration-200',
          collapsed ? 'lg:w-16' : 'lg:w-60',
        )}
      >
        {sidebarContent}
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
        {sidebarContent}
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
        <span className="ml-3 font-display font-bold text-text-900">
          {user.role === 'platformadmin' ? 'Admin Panel' : (user.university_name || 'Staff Portal')}
        </span>
      </div>

      {/* Content area */}
      <div className={cn('flex-1 pt-14 lg:pt-0 transition-all duration-200', collapsed ? 'lg:ml-16' : 'lg:ml-60')}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}
