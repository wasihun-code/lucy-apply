import { Skeleton } from '@/components/ui/Skeleton'

export default function ProgramDetailLoading() {
  return (
    <div>
      <Skeleton className="h-4 w-64 mb-6" />

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
        <div className="space-y-8">
          <div>
            <Skeleton className="h-6 w-24 mb-3" />
            <Skeleton className="h-9 w-3/4 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
