'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import type { Application } from '@/lib/api'

type ApplicationCardProps = {
  application: Application
}

const borderColor = (status: string) => {
  switch (status) {
    case 'admitted':
      return 'border-l-accent'
    case 'accepted':
      return 'border-l-success'
    case 'rejected':
      return 'border-l-danger'
    case 'draft':
      return ''
    default:
      return 'border-l-primary/20'
  }
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const router = useRouter()

  const handleClick = () => {
    if (application.status === 'draft') {
      router.push(
        `/dashboard/apply/${application.program}/?cycle=${application.admission_cycle}`,
      )
    } else {
      router.push(`/dashboard/applications/${application.id}/`)
    }
  }

  return (
    <Card
      interactive
      onClick={handleClick}
      padding="md"
      className={cn(
        'w-full',
        application.status !== 'draft' && 'border-l-4',
        borderColor(application.status),
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-base font-display font-semibold text-text-900 truncate">
            {application.program_name}
          </p>
          <p className="text-sm text-text-400 truncate">
            {application.university_name}
          </p>
        </div>

        {application.status !== 'draft' && (
          <div className="text-sm text-text-600 shrink-0 whitespace-nowrap">
            {application.document_verified_count ?? 0}/
            {application.document_total_count ?? 0} verified
          </div>
        )}

        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={application.status} />
          {application.submitted_at && (
            <span className="text-xs text-text-400 hidden sm:inline">
              {formatDate(application.submitted_at)}
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
