import Link from 'next/link'
import { fetchAPI, type University, type PaginatedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function UniversitiesPage() {
  let universities: University[] = []
  try {
    const data = await fetchAPI<PaginatedResponse<University>>('universities/')
    universities = data.results
  } catch {
    return (
      <div>
        <h1>Universities</h1>
        <p style={{ marginTop: '1rem', color: '#666' }}>
          Unable to load universities at this time. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1>Universities</h1>
      {universities.length === 0 ? (
        <p style={{ marginTop: '1rem', color: '#666' }}>No universities available at this time.</p>
      ) : (
        <div className="card-grid">
          {universities.map((u) => (
            <Link key={u.id} href={`/universities/${u.id}`} className="card">
              <h3>{u.name}</h3>
              <p>{u.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
