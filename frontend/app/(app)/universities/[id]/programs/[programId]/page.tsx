import Link from 'next/link'
import { FileText, ArrowLeft } from 'lucide-react'
import { fetchAPI, type Program, type AdmissionCycle } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const degreeLabels: Record<string, string> = {
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
}

export default async function ProgramDetailPage({
  params,
}: {
  params: { id: string; programId: string }
}) {
  let program: Program | null = null
  try {
    program = await fetchAPI<Program>(`programs/${params.programId}/`)
  } catch {
    return (
      <div className="space-y-4">
        <Link
          href={`/universities/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-text-600 hover:text-text-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Program List
        </Link>
        <Alert variant="danger">
          Unable to load program details. Please try again later.
        </Alert>
      </div>
    )
  }

  const degreeLabel = degreeLabels[program.degree_level] ?? program.degree_level

  return (
    <div>
      <PageHeader
        title={program.name}
        breadcrumb={[
          { label: 'Universities', href: '/universities' },
          {
            label: program.university_name,
            href: `/universities/${program.university}`,
          },
          { label: program.name, href: '#' },
        ]}
      />

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-10">
        <div className="space-y-8">
          <div>
            <StatusBadge status={degreeLabel.toLowerCase()} label={degreeLabel} />
            <p className="mt-4">
              <Link
                href={`/universities/${program.university}`}
                className="text-sm text-primary hover:underline"
              >
                {program.university_name}
              </Link>
            </p>
          </div>

          {program.description && (
            <section>
              <h2 className="text-xl font-display font-semibold text-text-900 mb-3">
                About This Program
              </h2>
              <p className="text-sm text-text-600 leading-relaxed">
                {program.description}
              </p>
            </section>
          )}

          {program.requirements && (
            <section>
              <h2 className="text-xl font-display font-semibold text-text-900 mb-3">
                Requirements
              </h2>
              <div className="text-sm text-text-600 leading-relaxed whitespace-pre-wrap">
                {program.requirements}
              </div>
            </section>
          )}

          {program.required_documents.length > 0 && (
            <section>
              <h2 className="text-xl font-display font-semibold text-text-900 mb-3">
                Required Documents
              </h2>
              <div className="space-y-2">
                {program.required_documents.map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm text-text-600"
                  >
                    <FileText className="w-5 h-5 shrink-0 text-text-400" />
                    <span>{doc.label}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-24">
            <Card padding="lg" className="space-y-5">
              <div>
                <p className="text-2xl font-bold text-text-900">
                  {formatCurrency(program.fee_amount, program.fee_currency)}
                </p>
                <p className="text-sm text-text-400">Application fee</p>
              </div>

              <hr className="border-border" />

              <div>
                <h3 className="text-sm font-semibold text-text-900 mb-3">
                  Open Admission Cycles
                </h3>
                {program.open_cycles.length > 0 ? (
                  <div className="space-y-3">
                    {program.open_cycles.map((cycle: AdmissionCycle) => (
                      <div key={cycle.id} className="space-y-1">
                        <p className="text-sm font-medium text-text-900">
                          {cycle.name}
                        </p>
                        <p className="text-xs text-text-400">
                          Deadline: {formatDate(cycle.close_date)}
                        </p>
                        <a
                          href={`/dashboard/apply/${params.programId}/?cycle=${cycle.id}`}
                          className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium rounded bg-primary text-white hover:bg-primary-dark transition-colors w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply Now
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert variant="info">
                    No open cycles at this time.
                  </Alert>
                )}
              </div>

              <Button variant="ghost" className="w-full" disabled>
                Save for later
              </Button>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  )
}
