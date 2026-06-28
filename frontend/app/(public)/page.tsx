import Link from 'next/link'
import { fetchAPI, type University, type PaginatedResponse } from '@/lib/api'

export default async function HomePage() {
  let universities: University[] = []
  try {
    const data = await fetchAPI<PaginatedResponse<University>>('universities/')
    universities = data.results.slice(0, 4)
  } catch {
    // API unavailable during static generation
  }

  return (
    <div>
      <section style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#1e3a5f' }}>
          Apply to Ethiopian Universities
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#666', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Browse programs, submit applications, and track your admission status — all in one place.
        </p>
        <Link
          href="/universities"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: '#2563eb',
            color: '#fff',
            borderRadius: '6px',
            fontWeight: 600,
          }}
        >
          Browse Universities
        </Link>
      </section>

      {universities.length > 0 && (
        <section>
          <h2 style={{ marginBottom: '1rem' }}>Featured Universities</h2>
          <div className="card-grid">
            {universities.map((u) => (
              <Link key={u.id} href={`/universities/${u.id}`} className="card">
                <h3>{u.name}</h3>
                <p>{u.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
