import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'

type ProgramCardProps = {
  program: {
    id: string
    name: string
    degree_level: string
    description: string
    fee_amount: string
    fee_currency: string
    university: string
    university_name: string
    open_cycles?: { close_date: string }[]
  }
}

const degreeLabels: Record<string, string> = {
  undergraduate: 'Undergraduate',
  postgraduate: 'Postgraduate',
}

export function ProgramCard({ program }: ProgramCardProps) {
  const degreeLabel = degreeLabels[program.degree_level] ?? program.degree_level
  const openCycle = program.open_cycles?.[0]

  return (
    <Link href={`/universities/${program.university}/programs/${program.id}`}>
      <Card interactive className="h-full flex flex-col">
        <p className="text-xs text-text-400 uppercase tracking-wide mb-1">
          {program.university_name}
        </p>
        <h3 className="text-base font-display font-semibold text-text-900 mb-2">
          {program.name}
        </h3>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
            'bg-primary-soft text-primary border-primary/20',
          )}
        >
          {degreeLabel}
        </span>
        <p className="text-sm text-text-600 line-clamp-2 mt-3 flex-1">
          {program.description}
        </p>
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-sm text-text-600">
            {formatCurrency(program.fee_amount, program.fee_currency)}
          </span>
          {openCycle ? (
            <span className="text-sm text-warning">
              Deadline: {formatDate(openCycle.close_date)}
            </span>
          ) : (
            <span className="text-sm text-text-400">Applications closed</span>
          )}
        </div>
        <span className="text-sm text-primary mt-2 inline-block self-end">
          View Program &rarr;
        </span>
      </Card>
    </Link>
  )
}
