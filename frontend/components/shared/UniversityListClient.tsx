'use client'

import { useState, useMemo } from 'react'
import { Building2 } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { UniversityCard } from './UniversityCard'
import { EmptyState } from './EmptyState'

type Props = {
  universities: {
    id: string
    name: string
    description: string
    status: string
    logo?: string | null
  }[]
}

export function UniversityListClient({ universities }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      universities.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [universities, search],
  )

  return (
    <div className="space-y-6">
      <Input
        aria-label="Search universities by name"
        placeholder="Search universities by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((u) => (
            <UniversityCard key={u.id} university={u} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="w-6 h-6 text-text-400" />}
          heading="No universities found"
          description="Try a different search."
        />
      )}
    </div>
  )
}
