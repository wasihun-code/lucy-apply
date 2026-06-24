import Link from 'next/link'
import { fetchAPI, type University, type Program, type PaginatedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function UniversityDetailPage({ params }: { params: { id: string } }) {
  let university: University | null = null
  let programs: Program[] = []
  try {
    const [uni, programsData] = await Promise.all([
      fetchAPI<University>(`universities/${params.id}/`),
      fetchAPI<PaginatedResponse<Program>>(`programs/?university=${params.id}`),
    ])
    university = uni
    programs = programsData.results
  } catch {
    return (
      <div>
        <Link href="/universities" style={{ fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>
          &larr; Back to Universities
        </Link>
        <p style={{ marginTop: '2rem', color: '#666' }}>
          Unable to load university details. Please try again later.
        </p>
      </div>
    )
  }

  return (
    <div>
      <Link href="/universities" style={{ fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>
        &larr; Back to Universities
      </Link>
      <h1>{university.name}</h1>
      <p style={{ margin: '1rem 0', color: '#666' }}>{university.description}</p>

      <h2 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Programs</h2>
      {programs.length === 0 ? (
        <p style={{ color: '#666' }}>No programs available at this time.</p>
      ) : (
        <div className="card-grid">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/universities/${params.id}/programs/${p.id}`}
              className="card"
            >
              <h3>{p.name}</h3>
              <span className="badge">{p.degree_level}</span>
              <p style={{ marginTop: '0.5rem' }}>
                Fee: {p.fee_currency} {p.fee_amount}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
