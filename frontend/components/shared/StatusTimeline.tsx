'use client'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn, formatDate } from '@/lib/utils'
import { statusLabel, historyDotColor } from '@/lib/application-helpers'

export type TimelineEntry = {
  id?: string
  from_status: string | null
  to_status: string
  changed_by_type: 'applicant' | 'university_staff' | 'system' | string
  reason?: string
  created_at: string
}

type StatusTimelineProps = {
  entries: TimelineEntry[]
  loading?: boolean
}

const ACTOR_LABELS: Record<string, string> = {
  applicant: 'by applicant',
  university_staff: 'by admissions team',
  system: 'automatically',
}

function getActorLabel(type: string): string {
  return ACTOR_LABELS[type] ?? `by ${type.replace(/_/g, ' ')}`
}

function TimelineEntryRow({ entry, isLast }: { entry: TimelineEntry; isLast: boolean }) {
  return (
    <div className="flex gap-3 pb-4 relative">
      {!isLast && (
        <div className="absolute left-[5px] top-3 bottom-0 w-0.5 bg-border" />
      )}
      <div className={cn('w-3 h-3 rounded-full mt-1 shrink-0 z-10', historyDotColor(entry.to_status))} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text-900">
            {statusLabel(entry.to_status)}
          </span>
          <StatusBadge status={entry.to_status} />
          <span className="text-xs text-text-400 ml-auto shrink-0">
            {formatDate(entry.created_at)}
          </span>
        </div>
        <p className="text-sm text-text-600 mt-0.5">
          {getActorLabel(entry.changed_by_type)}
          {entry.from_status && (
            <span className="text-xs text-text-400 ml-2">
              ← Previously: {statusLabel(entry.from_status)}
            </span>
          )}
        </p>
        {entry.reason && (
          <p className="text-sm text-text-400 italic mt-0.5">{entry.reason}</p>
        )}
      </div>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 pb-4">
          <Skeleton className="w-3 h-3 rounded-full shrink-0 mt-1" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatusTimeline({ entries, loading }: StatusTimelineProps) {
  if (loading) {
    return (
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
          Application Timeline
        </h2>
        <TimelineSkeleton />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
          Application Timeline
        </h2>
        <p className="text-sm text-text-600">No status changes recorded.</p>
      </div>
    )
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div>
      <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
        Application Timeline
      </h2>
      <div className="space-y-0">
        {sorted.map((entry, idx) => (
          <TimelineEntryRow
            key={entry.id ?? `${entry.to_status}-${entry.created_at}`}
            entry={entry}
            isLast={idx === sorted.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
