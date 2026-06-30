import { Skeleton } from '@/components/ui/Skeleton'

export default function PortalAuditLogLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex items-center gap-4 flex-wrap">
        <Skeleton className="h-10 w-40 rounded" />
        <Skeleton className="h-10 w-36 rounded" />
        <Skeleton className="h-10 w-36 rounded" />
      </div>
      <div className="space-y-2 mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}
