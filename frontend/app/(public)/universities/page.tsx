import { fetchAPI, type University, type PaginatedResponse } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { UniversityListClient } from '@/components/shared/UniversityListClient'

export const dynamic = 'force-dynamic'

export default async function UniversitiesPage() {
  let universities: University[] = []
  try {
    const data = await fetchAPI<PaginatedResponse<University>>('universities/')
    universities = data.results
  } catch {}

  return (
    <div>
      <PageHeader
        title="Universities"
        description="Browse our partner universities and explore their programs."
      />
      <UniversityListClient universities={universities} />
    </div>
  )
}
