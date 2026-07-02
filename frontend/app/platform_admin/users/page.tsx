'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Table, type Column } from '@/components/ui/Table'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type AdminUser = {
  id: string
  email: string
  full_name: string
  role: 'applicant' | 'universitystaff' | 'platformadmin'
  permission_level?: 'officer' | 'admin'
  university_id?: string
  university_name?: string
  account_status: 'active' | 'inactive'
  created_at: string | null
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `/api/proxy/${path.replace(/^\//, '')}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text.length > 200 ? `HTTP ${res.status}` : text || `HTTP ${res.status}`
    try {
      const json = JSON.parse(text)
      const extracted = json?.detail || json?.message || json?.error?.message || json?.error
      if (extracted) msg = String(extracted)
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [searchQuery])

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter !== 'all' && u.account_status !== statusFilter) return false
    return true
  })

  const loadData = useCallback(async () => {
    const me = await getMe()
    if (!me || me.role !== 'platformadmin') {
      router.push('/login')
      return
    }
    setCurrentUserId(me.id ?? null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)

      type UsersResponse = { results: AdminUser[] }
      const data = await authFetch<UsersResponse>(`admin/users/?${params.toString()}`)
      setUsers(data.results)
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [router, debouncedSearch])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleDeactivateClick(user: AdminUser) {
    setDeactivateTarget(user)
    setDeactivateError(null)
  }

  async function handleDeactivate() {
    if (!deactivateTarget || deactivating) return
    setDeactivating(true)
    setDeactivateError(null)
    try {
      await authFetch(`admin/users/${deactivateTarget.id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ account_status: 'deactivated' }),
      })
      setSuccess(`"${deactivateTarget.full_name}" has been deactivated.`)
      setDeactivateTarget(null)
      await loadData()
    } catch (e) {
      setDeactivateError(getErrorMessage(e))
    } finally {
      setDeactivating(false)
    }
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'full_name',
      header: 'Name',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-soft flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-primary">
              {u.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-medium text-text-900">{u.full_name}</p>
            <p className="text-xs text-text-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => {
        const badgeStatus = u.role === 'platformadmin' ? 'admin' : (u.permission_level ?? u.role)
        return <StatusBadge status={badgeStatus} label={u.permission_level === 'admin' ? 'Staff Admin' : u.permission_level === 'officer' ? 'Staff Officer' : u.role === 'platformadmin' ? 'Platform Admin' : u.role === 'universitystaff' ? 'Staff' : 'Applicant'} />
      },
    },
    {
      key: 'university_name',
      header: 'University',
      className: 'text-text-400',
      render: (u) => u.university_name || '\u2014',
    },
    {
      key: 'account_status',
      header: 'Status',
      render: (u) => <StatusBadge status={u.account_status} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      className: 'text-text-400',
      render: (u) => u.created_at ? formatDate(u.created_at) : '\u2014',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) =>
        u.account_status === 'active' && u.id !== currentUserId ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDeactivateClick(u)
            }}
          >
            Deactivate
          </Button>
        ) : null,
    },
  ]

  if (loading) return null

  return (
    <div>
      <PageHeader
        title="Users"
        description={users.length > 0 ? `${users.length} user${users.length !== 1 ? 's' : ''}` : undefined}
      />

      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
          aria-label="Search users"
        />
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-36"
          aria-label="Filter by role"
        >
          <option value="all">All Roles</option>
          <option value="applicant">Applicant</option>
          <option value="universitystaff">Staff</option>
          <option value="platformadmin">Platform Admin</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-36"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={<Users size={32} className="text-text-400" />}
          heading="No users found"
          description={debouncedSearch || roleFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'No users have been created yet.'}
        />
      ) : (
        <Table<AdminUser> columns={columns} data={filteredUsers} />
      )}

      <Modal
        open={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate User"
      >
        <p className="text-sm text-text-600 mb-4">
          Are you sure you want to deactivate{' '}
          <strong>{deactivateTarget?.full_name}</strong> ({deactivateTarget?.email})?
          This will prevent them from logging in.
        </p>
        {deactivateError && (
          <Alert variant="danger" className="mb-4">
            {deactivateError}
          </Alert>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeactivateTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deactivating} onClick={handleDeactivate}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </div>
  )
}
