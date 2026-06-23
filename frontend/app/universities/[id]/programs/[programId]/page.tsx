import Link from 'next/link'
import { fetchAPI, type Program, type AdmissionCycle } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function ProgramDetailPage({
  params,
}: {
  params: { id: string; programId: string }
}) {
  const program = await fetchAPI<Program>(`programs/${params.programId}/`)

  return (
    <div>
      <Link
        href={`/universities/${params.id}`}
        style={{ fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}
      >
        &larr; Back to Program List
      </Link>
      <h1>{program.name}</h1>
      <p style={{ margin: '0.5rem 0', color: '#666' }}>{program.university_name}</p>
      <span className="badge">{program.degree_level}</span>

      <section style={{ marginTop: '2rem' }}>
        <h2>Description</h2>
        <p style={{ marginTop: '0.5rem', color: '#666' }}>{program.description}</p>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Fee</h2>
        <p style={{ marginTop: '0.5rem' }}>
          {program.fee_currency} {program.fee_amount}
        </p>
      </section>

      {program.requirements && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Requirements</h2>
          <p style={{ marginTop: '0.5rem', color: '#666', whiteSpace: 'pre-wrap' }}>{program.requirements}</p>
        </section>
      )}

      {program.required_documents.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Required Documents</h2>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
            {program.required_documents.map((doc, i) => (
              <li key={i}>{doc.label}</li>
            ))}
          </ul>
        </section>
      )}

      {program.open_cycles.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Open Admission Cycles</h2>
          <div className="card-grid">
            {program.open_cycles.map((cycle: AdmissionCycle) => (
              <div key={cycle.id} className="card">
                <h3>{cycle.name}</h3>
                <p>Status: {cycle.status}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
