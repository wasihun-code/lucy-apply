import { Skeleton, SkeletonCard, SkeletonRow } from '@/components/ui/Skeleton'

export default function AdminStatsLoading() {
  return (
    <div className="animate-pulse">
      <Skeleton className="h-8 w-56 mb-6" />

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Status chips */}
      <Skeleton className="h-6 w-48 mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* University table */}
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="rounded-lg border border-border shadow-sm overflow-hidden mb-8">
        <div className="bg-background px-4 py-3 border-b border-border">
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20 ml-auto" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>

      {/* Recent activity */}
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="bg-background px-4 py-3 border-b border-border">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-8 ml-auto" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  )
}
