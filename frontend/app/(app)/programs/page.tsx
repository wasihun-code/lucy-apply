import { Suspense } from 'react'
import { fetchAPI, type Program, type University, type PaginatedResponse } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProgramListClient } from '@/components/shared/ProgramListClient'
import { SkeletonCard } from '@/components/ui/Skeleton'

export const dynamic = 'force-dynamic'

export default async function ProgramsPage() {
  let programs: Program[] = []
  let universities: University[] = []
  try {
    const [progData, uniData] = await Promise.all([
      fetchAPI<PaginatedResponse<Program>>('programs/'),
      fetchAPI<PaginatedResponse<University>>('universities/'),
    ])
    programs = progData.results
    universities = uniData.results
  } catch {}

  return (
    <div>
      <PageHeader
        title="Programs"
        description="Find the right program across all our partner universities."
      />
      <Suspense
        fallback={
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
        }
      >
        <ProgramListClient
          programs={programs}
          universities={universities.map((u) => ({ id: u.id, name: u.name }))}
        />
      </Suspense>
    </div>
  )
}
