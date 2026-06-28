import { SkeletonCard } from '@/components/ui/Skeleton'

export default function ProgramsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="h-10 w-48 bg-border rounded animate-pulse" />
        <div className="h-10 w-64 bg-border rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
