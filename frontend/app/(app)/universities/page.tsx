import { fetchAPI, type University, type PaginatedResponse } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { UniversityListClient } from '@/components/shared/UniversityListClient'
import { Alert } from '@/components/ui/Alert'

export const dynamic = 'force-dynamic'

export default async function UniversitiesPage() {
  let universities: University[] = []
  let error: string | null = null

  try {
    const data = await fetchAPI<PaginatedResponse<University>>('universities/')
    universities = data.results
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load universities'
  }

  return (
    <div>
      <PageHeader
        title="Universities"
        description="Browse our partner universities and explore their programs."
      />
      {error && (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}
      <UniversityListClient universities={universities} />
    </div>
  )
}
