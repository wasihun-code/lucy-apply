import { Skeleton } from '@/components/ui/Skeleton'
import { SkeletonRow } from '@/components/ui/Skeleton'

export default function CyclesLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
      <div className="overflow-x-auto">
        <div className="bg-background border-b border-border px-4 py-3">
          <div className="flex gap-8">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  )
}
