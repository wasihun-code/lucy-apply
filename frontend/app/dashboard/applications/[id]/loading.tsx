import { Skeleton } from '@/components/ui/Skeleton'

export default function ApplicationDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-20 w-full" />
      <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
        <Skeleton className="h-6 w-44" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
