import { SkeletonCard } from '@/components/ui/Skeleton'

export default function UniversitiesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 bg-border rounded animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
