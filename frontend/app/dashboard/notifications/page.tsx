'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/shared/EmptyState'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getErrorMessage } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  FileWarning,
} from 'lucide-react'

interface AppSummary {
  id: string
  program_name: string
  university_name: string
  status: string
  document_checklist: { type: string; label: string; status: string | null; uploaded: boolean }[]
  submitted_at: string | null
  created_at: string
}

interface HistoryEntry {
  from_status: string | null
  to_status: string
  changed_by_type: string
  reason: string
  created_at: string
}

interface Notification {
  id: string
  application_id: string
  program_name: string
  type: 'status_change' | 'document_flagged'
  message: string
  priority: 'high' | 'normal'
  created_at: string
}

const NOTIFICATIONS_KEY = 'lucy_notifications_visited'

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `/api/proxy/${path.replace(/^\//, '')}`
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
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

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  if (diffWeek < 4) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`
  return formatDate(dateStr)
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await authFetch<{ results: AppSummary[] }>('applications/')
      const apps = data.results || []
      const allNotifications: Notification[] = []

      const recentApps = apps
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

      for (const app of recentApps) {
        try {
          const history = await authFetch<HistoryEntry[]>(
            `applications/${app.id}/history/`,
          )
          for (const h of history) {
            if (h.to_status === 'admitted') {
              allNotifications.push({
                id: `admitted-${app.id}-${h.created_at}`,
                application_id: app.id,
                program_name: app.program_name,
                type: 'status_change',
                message: "You've been admitted!",
                priority: 'high',
                created_at: h.created_at,
              })
            } else if (h.to_status === 'rejected') {
              allNotifications.push({
                id: `rejected-${app.id}-${h.created_at}`,
                application_id: app.id,
                program_name: app.program_name,
                type: 'status_change',
                message: 'Application decision received',
                priority: 'normal',
                created_at: h.created_at,
              })
            } else if (h.to_status === 'waitlisted') {
              allNotifications.push({
                id: `waitlisted-${app.id}-${h.created_at}`,
                application_id: app.id,
                program_name: app.program_name,
                type: 'status_change',
                message: "You've been waitlisted",
                priority: 'normal',
                created_at: h.created_at,
              })
            } else if (h.to_status === 'under_review') {
              allNotifications.push({
                id: `review-${app.id}-${h.created_at}`,
                application_id: app.id,
                program_name: app.program_name,
                type: 'status_change',
                message: 'Your application is being reviewed',
                priority: 'normal',
                created_at: h.created_at,
              })
            }
          }
        } catch {
          // skip apps whose history we can't fetch
        }

        const flagged = app.document_checklist?.find(
          (d) => d.status === 'flagged',
        )
        if (flagged) {
          allNotifications.push({
            id: `flagged-${app.id}-${flagged.type}`,
            application_id: app.id,
            program_name: app.program_name,
            type: 'document_flagged',
            message: `A document needs your attention (${flagged.label})`,
            priority: 'high',
            created_at: app.submitted_at || app.created_at,
          })
        }
      }

      allNotifications.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      setNotifications(allNotifications)
      localStorage.setItem(NOTIFICATIONS_KEY, Date.now().toString())
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <NotificationsSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Notifications" />
        <Alert variant="danger">{error}</Alert>
        <Button variant="ghost" onClick={load}>Retry</Button>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div>
        <PageHeader title="Notifications" />
        <EmptyState
          icon={<Bell size={24} className="text-text-400" />}
          heading="No notifications"
          description="Updates about your applications will appear here."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="space-y-3">
        {notifications.map((n) => {
          const isHigh = n.priority === 'high'
          return (
            <Link key={n.id} href={`/dashboard/applications/${n.application_id}`}>
              <Card
                className={cn(
                  'flex items-start gap-4 transition-shadow hover:shadow-md',
                  isHigh && n.type === 'status_change' && 'border-l-4 border-l-accent',
                  isHigh && n.type === 'document_flagged' && 'border-l-4 border-l-warning',
                )}
                padding="md"
              >
                <div
                  className={cn(
                    'rounded-full p-2 shrink-0',
                    n.type === 'status_change' && n.priority === 'high' && 'bg-accent/10',
                    n.type === 'status_change' && n.priority === 'normal' && 'bg-primary-soft',
                    n.type === 'document_flagged' && 'bg-warning/10',
                  )}
                >
                  {n.type === 'status_change' && n.priority === 'high' && (
                    <CheckCircle2 size={20} className="text-accent" />
                  )}
                  {n.type === 'status_change' && n.priority === 'normal' && (
                    <Clock size={20} className="text-primary" />
                  )}
                  {n.type === 'document_flagged' && (
                    <FileWarning size={20} className="text-warning" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-900">
                    Application to {n.program_name}
                  </p>
                  <p className="text-sm text-text-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-text-400 mt-1">
                    {relativeTime(n.created_at)}
                  </p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function NotificationsSkeleton() {
  return (
    <div>
      <PageHeader title="Notifications" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-lg border border-border shadow-sm p-6 flex items-start gap-4 animate-pulse"
          >
            <div className="rounded-full bg-border h-10 w-10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-border rounded w-3/5" />
              <div className="h-3 bg-border rounded w-4/5" />
              <div className="h-3 bg-border rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
