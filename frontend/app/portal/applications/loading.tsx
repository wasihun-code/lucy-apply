import { Skeleton, SkeletonRow } from '@/components/ui/Skeleton'

export default function ApplicationsLoading() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="flex gap-3 mb-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="overflow-x-auto">
        <div className="w-full">
          <Skeleton className="h-10 w-full mb-1" />
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
