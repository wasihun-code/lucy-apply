import { Skeleton } from '@/components/ui/Skeleton'

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

export function historyDotColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-neutral/30'
    case 'submitted':
      return 'bg-primary'
    case 'under_review':
      return 'bg-warning'
    case 'admitted':
    case 'accepted':
      return 'bg-success'
    case 'rejected':
    case 'declined':
      return 'bg-danger'
    case 'waitlisted':
      return 'bg-neutral'
    default:
      return 'bg-neutral/30'
  }
}

export function getDocDisplayStatus(item: {
  status: string | null
  uploaded: boolean
}): { badgeStatus: string; label: string } {
  if (!item.uploaded) return { badgeStatus: 'draft', label: 'Not Uploaded' }
  if (!item.status) return { badgeStatus: 'pending', label: 'Pending' }
  if (item.status === 'verified') return { badgeStatus: 'accepted', label: 'Verified' }
  if (item.status === 'flagged') return { badgeStatus: 'rejected', label: 'Flagged' }
  return { badgeStatus: 'pending', label: 'Pending' }
}

export function ApplicationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse bg-border rounded h-8 w-48" />
      <div className="animate-pulse bg-border rounded h-4 w-64 mt-2" />
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
            <div className="animate-pulse bg-border rounded h-6 w-48" />
            <div className="animate-pulse bg-border rounded h-4 w-full" />
            <div className="animate-pulse bg-border rounded h-4 w-3/4" />
            <div className="animate-pulse bg-border rounded h-4 w-1/2" />
            <div className="animate-pulse bg-border rounded h-20 w-full" />
          </div>
          <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
            <div className="animate-pulse bg-border rounded h-6 w-48" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="animate-pulse bg-border rounded h-8 w-8" />
                  <div className="space-y-1">
                    <div className="animate-pulse bg-border rounded h-4 w-32" />
                    <div className="animate-pulse bg-border rounded h-3 w-20" />
                  </div>
                </div>
                <div className="animate-pulse bg-border rounded h-6 w-20" />
              </div>
            ))}
          </div>
          <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
            <div className="animate-pulse bg-border rounded h-6 w-48" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="animate-pulse bg-border rounded h-3 w-3 shrink-0 mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="animate-pulse bg-border rounded h-4 w-48" />
                  <div className="animate-pulse bg-border rounded h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
            <div className="animate-pulse bg-border rounded h-6 w-24" />
            <div className="animate-pulse bg-border rounded h-4 w-full" />
            <div className="animate-pulse bg-border rounded h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
