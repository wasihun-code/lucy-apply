import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/Card'

type UniversityCardProps = {
  university: {
    id: string
    name: string
    description: string
    status: string
    logo?: string | null
  }
}

export function UniversityCard({ university }: UniversityCardProps) {
  const initials = university.name.slice(0, 2).toUpperCase()

  return (
    <Link href={`/universities/${university.id}`}>
      <Card interactive className="h-full flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          {university.logo ? (
            <Image
              src={university.logo}
              alt={`${university.name} logo`}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-display font-semibold shrink-0">
              {initials}
            </div>
          )}
          <h3 className="text-base font-display font-semibold text-text-900">
            {university.name}
          </h3>
        </div>
        <p className="text-sm text-text-600 line-clamp-2 flex-1">
          {university.description}
        </p>
        <span className="text-sm text-primary mt-4 inline-block">
          View Programs &rarr;
        </span>
      </Card>
    </Link>
  )
}
