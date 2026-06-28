import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, GraduationCap, CalendarClock, FileText } from 'lucide-react'
import { fetchAPI, type University, type Program, type PaginatedResponse } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { PageHeader } from '@/components/shared/PageHeader'
import { ProgramFilterClient } from '@/components/shared/ProgramFilterClient'
import { EmptyState } from '@/components/shared/EmptyState'

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
      <div className="space-y-4">
        <Link
          href="/universities"
          className="inline-flex items-center gap-1 text-sm text-text-600 hover:text-text-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Universities
        </Link>
        <Alert variant="danger">
          Unable to load university details. Please try again later.
        </Alert>
      </div>
    )
  }

  const initials = university.name.slice(0, 2).toUpperCase()
  const openCycles = programs.reduce(
    (count, p) => count + (p.open_cycles?.length ?? 0),
    0,
  )

  return (
    <div>
      <Link
        href="/universities"
        className="inline-flex items-center gap-1 text-sm text-text-600 hover:text-text-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Universities
      </Link>

      <section className="bg-primary-soft rounded-lg p-8 mb-6">
        <div className="flex items-center gap-6">
          {university.logo ? (
            <div className="bg-white rounded-lg shadow-sm p-2 shrink-0">
              <Image
                src={university.logo}
                alt={`${university.name} logo`}
                width={80}
                height={80}
                className="rounded-lg object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-primary text-white flex items-center justify-center text-2xl font-display font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-4xl font-display font-bold text-text-900 break-words">
              {university.name}
            </h1>
            <p className="text-lg text-text-600 mt-1">
              {university.description}
            </p>
            {university.status === 'inactive' && (
              <div className="mt-2">
                <StatusBadge status="inactive" label="Applications Paused" />
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-surface border border-border rounded-lg">
        <div>
          <p className="text-sm text-text-600">Programs</p>
          <p className="text-base font-semibold text-text-900">{programs.length}</p>
        </div>
        <div>
          <p className="text-sm text-text-600">Open Cycles</p>
          <p className="text-base font-semibold text-text-900">{openCycles}</p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
        <div>
          <section className="mb-10">
            <h2 className="text-xl font-display font-semibold text-text-900 mb-3">
              About
            </h2>
            <p className="text-sm text-text-600 leading-relaxed">
              {university.accreditation_info ?? university.description}
            </p>
          </section>

          <section id="programs-section">
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-display font-semibold text-text-900">
                Programs
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-primary-soft text-primary border-primary/20">
                {programs.length}
              </span>
            </div>

            {programs.length > 0 ? (
              <ProgramFilterClient programs={programs} />
            ) : (
              <EmptyState
                icon={<GraduationCap className="w-6 h-6 text-text-400" />}
                heading="No programs available"
                description="This university has no programs at this time."
              />
            )}
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="lg:sticky lg:top-24">
            <Card padding="lg" className="space-y-4">
              <h3 className="text-base font-display font-semibold text-text-900">
                Start Your Application
              </h3>
              <p className="text-sm text-text-600">
                Browse our programs below to apply.
              </p>
              <a
                href="#programs-section"
                className="inline-flex items-center justify-center h-11 px-5 text-base font-medium rounded bg-primary text-white hover:bg-primary-dark transition-colors w-full"
              >
                Browse Programs
              </a>
              <hr className="border-border" />
              <div className="flex items-center gap-3 text-sm text-text-400">
                <FileText className="w-4 h-4 shrink-0" />
                <span>Contact the admissions office for more information.</span>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  )
}
