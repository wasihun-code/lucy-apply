import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminUsersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-40 rounded" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-64 rounded" />
        <Skeleton className="h-10 w-36 rounded" />
        <Skeleton className="h-10 w-36 rounded" />
      </div>
      <div className="space-y-2 mt-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
