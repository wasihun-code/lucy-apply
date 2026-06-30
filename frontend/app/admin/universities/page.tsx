'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import type { AdminUniversity, PaginatedResponse } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Table, type Column } from '@/components/ui/Table'
import { EmptyState } from '@/components/shared/EmptyState'
import { Building2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

type StatusFilter = 'all' | 'active' | 'inactive'

export default function AdminUniversitiesPage() {
  const router = useRouter()
  const [universities, setUniversities] = useState<AdminUniversity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [statusTarget, setStatusTarget] = useState<AdminUniversity | null>(null)
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate'>('activate')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const me = await getMe()
    if (!me || me.role !== 'platformadmin') {
      router.push('/login')
      return
    }
    try {
      const data = await authFetch<PaginatedResponse<AdminUniversity>>('admin/universities/')
      setUniversities(data.results)
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = universities.filter((u) => {
    if (statusFilter === 'all') return true
    return u.status === statusFilter
  })

  function confirmDeactivate(u: AdminUniversity) {
    setStatusTarget(u)
    setStatusAction('deactivate')
    setStatusError(null)
  }

  function confirmActivate(u: AdminUniversity) {
    setStatusTarget(u)
    setStatusAction('activate')
    setStatusError(null)
  }

  async function handleStatusChange() {
    if (!statusTarget || savingStatus) return
    setSavingStatus(true)
    setStatusError(null)
    const newStatus = statusAction === 'activate' ? 'active' : 'inactive'
    try {
      await authFetch(`universities/${statusTarget.id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setSuccess(
        `"${statusTarget.name}" has been ${statusAction === 'activate' ? 'activated' : 'deactivated'}.`,
      )
      setStatusTarget(null)
      await loadData()
    } catch (e) {
      setStatusError(getErrorMessage(e))
    } finally {
      setSavingStatus(false)
    }
  }

  const columns: Column<AdminUniversity>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <Link
          href={`/admin/universities/${u.id}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {u.name}
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: 'program_count',
      header: 'Programs',
      className: 'text-text-400',
      render: (u) => u.program_count ?? 0,
    },
    {
      key: 'application_count',
      header: 'Applications',
      className: 'text-text-400',
      render: (u) => u.application_count ?? 0,
    },
    {
      key: 'created_at',
      header: 'Created',
      className: 'text-text-400',
      render: (u) => formatDate(u.created_at),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {u.status === 'inactive' && (
            <Button variant="ghost" size="sm" onClick={() => confirmActivate(u)}>
              Activate
            </Button>
          )}
          {u.status === 'active' && (
            <Button variant="ghost" size="sm" onClick={() => confirmDeactivate(u)}>
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (loading) return null

  return (
    <div>
      <PageHeader
        title="Universities"
        action={
          <Link href="/admin/universities/new">
            <Button variant="primary" size="sm">
              + Onboard University
            </Button>
          </Link>
        }
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

      <div className="mb-6">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-40"
          aria-label="Filter by status"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 size={32} className="text-text-400" />}
          heading="No universities"
          description="Onboard your first university partner to get started."
          action={{ label: '+ Onboard University', href: '/admin/universities/new' }}
        />
      ) : (
        <Table<AdminUniversity>
          columns={columns}
          data={filtered}
          onRowClick={(u) => router.push(`/admin/universities/${u.id}`)}
        />
      )}

      <Modal
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={statusAction === 'activate' ? 'Activate University' : 'Deactivate University'}
      >
        <p className="text-sm text-text-600 mb-4">
          {statusAction === 'activate'
            ? `Are you sure you want to activate "${statusTarget?.name}"? It will become visible to applicants.`
            : `Are you sure you want to deactivate "${statusTarget?.name}"? It will be hidden from applicants and no new applications will be accepted.`}
        </p>
        {statusError && (
          <Alert variant="danger" className="mb-4">
            {statusError}
          </Alert>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setStatusTarget(null)}>
            Cancel
          </Button>
          <Button
            variant={statusAction === 'deactivate' ? 'danger' : 'primary'}
            loading={savingStatus}
            onClick={handleStatusChange}
          >
            {statusAction === 'activate' ? 'Activate' : 'Deactivate'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
