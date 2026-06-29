import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-3"
          >
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-36" />
      </div>
      {[1, 2, 3].map((i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
