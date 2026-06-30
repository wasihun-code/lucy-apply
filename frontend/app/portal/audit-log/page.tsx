'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { getErrorMessage, type PaginatedResponse } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/shared/EmptyState'
import { ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

type AuditEntry = {
  id: string
  action: string
  actor_type: string
  actor_id: string
  entity_type: string
  entity_id: string
  university?: string
  before_state?: Record<string, unknown> | null
  after_state?: Record<string, unknown> | null
  created_at: string
}

const ACTOR_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  university_staff: 'University Staff',
  applicant: 'Applicant',
}

const ACTION_LABELS: Record<string, string> = {
  university_status_change: 'University Status Change',
  staff_invited: 'Staff Invited',
  staff_deactivated: 'Staff Deactivated',
  program_created: 'Program Created',
  program_updated: 'Program Updated',
  cycle_created: 'Cycle Created',
  cycle_closed: 'Cycle Closed',
  application_status_change: 'Application Status Change',
  user_deactivated: 'User Deactivated',
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
]

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

export default function PortalAuditLogPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const me = await getMe()
    if (!me || me.role !== 'universitystaff') {
      router.push('/login')
      return
    }
    if (me.permission_level !== 'admin') {
      router.push('/portal/applications')
      return
    }
    if (!me.university) {
      router.push('/portal/applications')
      return
    }

    try {
      const params = new URLSearchParams()
      if (actionFilter) params.set('action', actionFilter)
      if (startDate) params.set('start_date', startDate)
      if (endDate) params.set('end_date', endDate)
      params.set('page', String(currentPage))

      const data = await authFetch<PaginatedResponse<AuditEntry>>(`universities/${me.university}/audit-log/?${params.toString()}`)
      setEntries(data.results)
      setTotalCount(data.count)
      setTotalPages(Math.max(1, Math.ceil(data.count / 20)))
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [router, actionFilter, startDate, endDate, currentPage])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setCurrentPage(1)
  }, [actionFilter, startDate, endDate])

  function handlePageChange(page: number) {
    setCurrentPage(page)
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id)
  }

  function formatAction(action: string): string {
    return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function formatActor(entry: AuditEntry): string {
    const label = ACTOR_LABELS[entry.actor_type] || entry.actor_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return `${label} (#${entry.actor_id})`
  }

  if (loading) return null

  return (
    <div>
      <PageHeader title="Audit Log" />

      {error && (
        <Alert variant="danger" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-40"
          aria-label="Filter by action"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
            aria-label="Start date"
          />
          <span className="text-text-400 text-sm">to</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
            aria-label="End date"
          />
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={32} className="text-text-400" />}
          heading="No audit entries"
          description="No events match your current filters."
        />
      ) : (
        <>
          <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left">Action</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left">Actor</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        className="p-1 text-text-400 hover:text-text-600 transition-colors"
                        aria-label={expandedId === entry.id ? 'Collapse details' : 'Expand details'}
                      >
                        {expandedId === entry.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-900">
                      {formatAction(entry.action)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-600">
                      {formatActor(entry)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-400 whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {entries.map((entry) =>
              expandedId === entry.id ? (
                <div key={`detail-${entry.id}`} className="border-t border-border bg-background/50 px-14 py-4 space-y-3">
                  {entry.before_state && Object.keys(entry.before_state).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-600 mb-1 uppercase tracking-wide">Before State</p>
                      <pre className="text-xs text-text-600 bg-surface border border-border rounded p-3 overflow-x-auto">
                        {JSON.stringify(entry.before_state, null, 2)}
                      </pre>
                    </div>
                  )}
                  {entry.after_state && Object.keys(entry.after_state).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-text-600 mb-1 uppercase tracking-wide">After State</p>
                      <pre className="text-xs text-text-600 bg-surface border border-border rounded p-3 overflow-x-auto">
                        {JSON.stringify(entry.after_state, null, 2)}
                      </pre>
                    </div>
                  )}
                  {(!entry.before_state || Object.keys(entry.before_state).length === 0) &&
                   (!entry.after_state || Object.keys(entry.after_state).length === 0) && (
                    <p className="text-xs text-text-400 italic">No state details available.</p>
                  )}
                </div>
              ) : null,
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-text-400">
                Page {currentPage} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
