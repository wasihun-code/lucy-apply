'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import { getErrorMessage, type AdminUniversity, type PaginatedResponse } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { ErrorState } from '@/components/shared/ErrorState'
import { Users, Building2, FileText, BookOpen, ArrowRight, ChevronRight } from 'lucide-react'

type AdminStats = {
  total_applicants: number
  total_universities: number
  active_universities: number
  inactive_universities: number
  total_programs: number
  total_staff: number
  applications_by_status: Record<string, number>
}

type AuditEntry = {
  id: string
  action: string
  actor_type: string
  actor_id: string
  university?: string
  created_at: string
}

const ACTOR_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  university_staff: 'Staff',
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

const STATUS_ORDER = ['draft', 'submitted', 'under_review', 'admitted', 'rejected', 'accepted']

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

function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export default function AdminStatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [universities, setUniversities] = useState<AdminUniversity[]>([])
  const [recentActivity, setRecentActivity] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const me = await getMe()
    if (!me || me.role !== 'platformadmin') {
      router.push('/login')
      return
    }
    try {
      const [statsData, uniData] = await Promise.all([
        authFetch<AdminStats>('admin/stats/'),
        authFetch<PaginatedResponse<AdminUniversity>>('admin/universities/'),
      ])
      setStats(statsData)
      setUniversities(uniData.results)
      setError(null)

      authFetch<PaginatedResponse<AuditEntry>>('admin/audit-log/')
        .then((d) => setRecentActivity(d.results.slice(0, 5)))
        .catch(() => {})
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalApplications = stats
    ? Object.values(stats.applications_by_status).reduce((a, b) => a + b, 0)
    : 0

  const topUniversities = [...universities]
    .sort((a, b) => (b.application_count ?? 0) - (a.application_count ?? 0))
    .slice(0, 5)

  function formatAction(action: string): string {
    return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function formatActor(entry: AuditEntry): string {
    return ACTOR_LABELS[entry.actor_type] || entry.actor_type
  }

  if (loading) return null

  if (error) {
    return (
      <ErrorState
        heading="Failed to load stats"
        message={error}
        onRetry={loadData}
      />
    )
  }

  if (!stats) return null

  return (
    <div>
      <PageHeader title="Platform Overview" />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-primary-soft text-primary rounded-lg p-2">
              <Users size={20} />
            </div>
          </div>
          <p className="text-4xl font-display font-bold text-text-900">
            {formatNumber(stats.total_applicants)}
          </p>
          <p className="text-sm text-text-400 mt-1">Registered Applicants</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-primary-soft text-primary rounded-lg p-2">
              <Building2 size={20} />
            </div>
          </div>
          <p className="text-4xl font-display font-bold text-text-900">
            {formatNumber(stats.total_universities)}
          </p>
          <p className="text-sm text-text-400 mt-1">Partner Universities</p>
          {stats.active_universities > 0 && (
            <p className="text-xs text-success mt-1">
              {stats.active_universities} active
            </p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-primary-soft text-primary rounded-lg p-2">
              <FileText size={20} />
            </div>
          </div>
          <p className="text-4xl font-display font-bold text-text-900">
            {formatNumber(totalApplications)}
          </p>
          <p className="text-sm text-text-400 mt-1">Total Applications</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-primary-soft text-primary rounded-lg p-2">
              <BookOpen size={20} />
            </div>
          </div>
          <p className="text-4xl font-display font-bold text-text-900">
            {formatNumber(stats.total_programs)}
          </p>
          <p className="text-sm text-text-400 mt-1">Active Programs</p>
        </Card>
      </div>

      {/* Applications by Status */}
      <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
        Applications by Status
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {STATUS_ORDER.map((status) => {
          const count = stats.applications_by_status[status] ?? 0
          return (
            <Card key={status} padding="sm" className="p-4">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={status} />
              </div>
              <p className="text-2xl font-display font-bold text-text-900">
                {formatNumber(count)}
              </p>
              <p className="text-xs text-text-400 mt-0.5">
                {status === 'under_review' ? 'Pending review' : `${status.replace(/_/g, ' ')} applications`}
              </p>
            </Card>
          )
        })}
      </div>

      {/* Universities */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-semibold text-text-900">
          Universities
        </h2>
        <Link
          href="/platform_admin/universities"
          className="text-sm text-primary hover:text-primary-dark font-medium inline-flex items-center gap-1 transition-colors"
        >
          View all
          <ArrowRight size={14} />
        </Link>
      </div>
      <Card className="mb-8 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left">University</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left">Status</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-right">Applications</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-right">Programs</th>
            </tr>
          </thead>
          <tbody>
            {topUniversities.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-sm text-text-400 text-center">
                  No universities found.
                </td>
              </tr>
            ) : (
              topUniversities.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0 hover:bg-primary-soft/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/platform_admin/universities/${u.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-text-900">{u.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-900 text-right">{formatNumber(u.application_count ?? 0)}</td>
                  <td className="px-4 py-3 text-sm text-text-900 text-right">{formatNumber(u.program_count ?? 0)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-display font-semibold text-text-900">
              Recent Activity
            </h2>
            <Link
              href="/platform_admin/audit-log"
              className="text-sm text-primary hover:text-primary-dark font-medium inline-flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          <Card className="overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left">Action</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-left">Actor</th>
                  <th className="px-4 py-3 text-xs uppercase tracking-wide text-text-400 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm text-text-900">{formatAction(entry.action)}</td>
                    <td className="px-4 py-3 text-sm text-text-600">{formatActor(entry)}</td>
                    <td className="px-4 py-3 text-sm text-text-400 text-right whitespace-nowrap">
                      {timeAgo(entry.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
