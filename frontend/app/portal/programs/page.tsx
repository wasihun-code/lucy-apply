'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { BookOpen, Pencil } from 'lucide-react'

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
    const msg = text.length > 200 ? `HTTP ${res.status}` : text || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

interface ProgramItem {
  id: string
  name: string
  degree_level: string
  status: string
  fee_amount: string
  fee_currency: string
  created_at: string
}

const STATUS_FILTERS = ['all', 'draft', 'published', 'archived'] as const

export default function ProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [me, setMe] = useState<{ university?: string; permission_level?: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    getMe().then((m) => {
      if (!m) { router.push('/login'); return }
      if (m.role !== 'universitystaff') { router.push('/dashboard'); return }
      if (!m.university) { setLoading(false); return }
      setMe({ university: m.university, permission_level: m.permission_level })

      return authFetch<{ results: ProgramItem[] }>(
        `universities/${m.university}/programs/`,
      )
        .then((data) => {
          setPrograms(data.results || [])
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Failed to load programs')
        })
    }).catch(() => {
      router.push('/login')
    }).finally(() => {
      setLoading(false)
    })
  }, [router])

  const isAdmin = me?.permission_level === 'admin'

  const filtered = statusFilter === 'all'
    ? programs
    : programs.filter((p) => p.status === statusFilter)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Programs"
        action={
          isAdmin && (
            <Button variant="primary" size="sm" onClick={() => router.push('/portal/programs/new')}>
              + New Program
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="danger" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-body font-medium text-text-600 shrink-0">
          Status:
        </label>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </Select>
        {statusFilter !== 'all' && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')}>
            Clear
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} className="text-text-400" />}
          heading="No programs yet"
          description="Create your first program to start accepting applications."
          action={
            isAdmin ? { label: '+ New Program', href: '/portal/programs/new' } : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3 max-w-3xl">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-surface rounded-lg border border-border shadow-sm p-4"
            >
              <div className="min-w-0">
                <p
                  className={`text-base font-display font-semibold text-text-900 truncate ${
                    p.status === 'archived' ? 'line-through text-text-400' : ''
                  }`}
                >
                  {p.name}
                </p>
                <p className="text-sm font-body font-normal text-text-600 mt-0.5">
                  {p.degree_level} &middot; {p.fee_currency} {p.fee_amount}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <StatusBadge status={p.status} />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/portal/programs/${p.id}/cycles`)}
                >
                  Cycles
                </Button>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/portal/programs/${p.id}/edit`)}
                    aria-label={`Edit ${p.name}`}
                  >
                    <Pencil size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
