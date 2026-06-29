'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe, AuthUser } from '@/lib/auth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, Column } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/Button'
import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'
import { FileText } from 'lucide-react'

interface ApplicationItem {
  id: string
  applicant: string
  applicant_name: string
  program: string
  program_name: string
  status: string
  submitted_at: string | null
  document_verified_count: number
  document_total_count: number
}

interface ProgramItem {
  id: string
  name: string
}

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

const PAGE_SIZE = 20

export default function ApplicationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [apps, setApps] = useState<ApplicationItem[]>([])
  const [programs, setPrograms] = useState<ProgramItem[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [statusFilter, setStatusFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setStatusFilter(params.get('status') || '')
    setProgramFilter(params.get('program') || '')
    setPage(Number(params.get('page')) || 1)
  }, [])

  useEffect(() => {
    getMe().then((m) => {
      if (!m || (m.role !== 'universitystaff' && m.role !== 'platformadmin')) {
        router.push('/login')
        return
      }
      setUser(m)
      if (!m.university) return
      fetch(`/api/proxy/universities/${m.university}/programs/`)
        .then((r) => r.ok ? r.json() : Promise.reject())
        .then((data: PaginatedResponse<ProgramItem>) => {
          setPrograms(data.results || [])
        }).catch(() => {})
    }).catch(() => router.push('/login'))
  }, [router])

  const fetchApps = useCallback(() => {
    if (!user?.university) return
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (programFilter) params.set('program', programFilter)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    fetch(`/api/proxy/universities/${user.university}/applications/${qs ? `?${qs}` : ''}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data: PaginatedResponse<ApplicationItem>) => {
        setApps(data.results || [])
        setCount(data.count)
      }).catch(() => {
        setApps([])
        setCount(0)
      }).finally(() => setLoading(false))
  }, [user, statusFilter, programFilter, page])

  useEffect(() => {
    if (user?.university) fetchApps()
  }, [user, fetchApps])

  useEffect(() => {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (programFilter) params.set('program', programFilter)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    const newQs = qs ? `?${qs}` : ''
    if (window.location.search !== newQs) {
      router.replace(`/portal/applications${newQs}`, { scroll: false })
    }
  }, [statusFilter, programFilter, page, router])

  function handleStatusChange(value: string) {
    setStatusFilter(value)
    setPage(1)
  }

  function handleProgramChange(value: string) {
    setProgramFilter(value)
    setPage(1)
  }

  function handlePageChange(newPage: number) {
    setPage(newPage)
  }

  function clearFilters() {
    setStatusFilter('')
    setProgramFilter('')
    setPage(1)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedApps = useMemo(() => {
    if (!sortKey) return apps
    return [...apps].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''
      switch (sortKey) {
        case 'applicant_name':
          aVal = a.applicant_name.toLowerCase()
          bVal = b.applicant_name.toLowerCase()
          break
        case 'program_name':
          aVal = a.program_name.toLowerCase()
          bVal = b.program_name.toLowerCase()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'submitted_at':
          aVal = a.submitted_at || ''
          bVal = b.submitted_at || ''
          break
        default:
          return 0
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [apps, sortKey, sortDir])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  const columns: Column<ApplicationItem>[] = [
    {
      key: 'applicant_name',
      header: 'Applicant',
      sortable: true,
      render: (app) => (
        <div>
          <div className="font-medium text-text-900">{app.applicant_name}</div>
          <div className="text-xs text-text-400">{app.applicant}</div>
        </div>
      ),
    },
    {
      key: 'program_name',
      header: 'Program',
      sortable: true,
      render: (app) => <span className="text-text-600">{app.program_name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      className: 'w-32',
      render: (app) => <StatusBadge status={app.status} />,
    },
    {
      key: 'submitted_at',
      header: 'Submitted',
      sortable: true,
      className: 'w-28',
      render: (app) => (
        <span className="text-text-600 text-sm">
          {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'documents',
      header: 'Documents',
      className: 'w-28',
      render: (app) => (
        <span className="text-text-600 text-sm">
          {app.document_verified_count}/{app.document_total_count} verified
        </span>
      ),
    },
  ]

  const hasFilters = statusFilter || programFilter

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Review and manage applications submitted to your programs"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-40"
        >
          <option value="">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="admitted">Admitted</option>
          <option value="rejected">Rejected</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
        </Select>

        <Select
          value={programFilter}
          onChange={(e) => handleProgramChange(e.target.value)}
          className="w-56"
        >
          <option value="">All programs</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
        )}
      </div>

      {loading ? (
        <div className="overflow-x-auto">
          <div className="w-full">
            <Skeleton className="h-10 w-full mb-1" />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      ) : sortedApps.length === 0 ? (
        <EmptyState
          icon={<FileText size={32} className="text-text-400" />}
          heading="No applications found"
          description={hasFilters ? 'Try adjusting your filters to see more results.' : 'Applications submitted to your programs will appear here.'}
        />
      ) : (
        <>
          <Table<ApplicationItem>
            columns={columns}
            data={sortedApps}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={(app) => router.push(`/portal/applications/${app.id}`)}
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  )
}
