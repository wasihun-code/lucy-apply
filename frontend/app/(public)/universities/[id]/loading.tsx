import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'

export default function UniversityDetailLoading() {
  return (
    <div>
      <div className="bg-primary-soft rounded-lg h-40 animate-pulse mb-6" />

      <div className="flex gap-8 mb-8">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] lg:gap-10">
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
