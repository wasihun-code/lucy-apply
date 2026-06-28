'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { ProgramCard } from './ProgramCard'
import { EmptyState } from './EmptyState'

type Props = {
  programs: {
    id: string
    name: string
    degree_level: string
    description: string
    fee_amount: string
    fee_currency: string
    university: string
    university_name: string
    open_cycles?: { close_date: string }[]
  }[]
  universities: { id: string; name: string }[]
}

export function ProgramListClient({ programs, universities }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const degreeLevel = searchParams.get('degree_level') ?? 'all'
  const university = searchParams.get('university') ?? 'all'

  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'all') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
      router.replace(`/programs${params.toString() ? `?${params.toString()}` : ''}`, {
        scroll: false,
      })
    },
    [router, searchParams],
  )

  const filtered = useMemo(() => {
    let result = programs
    if (degreeLevel !== 'all') {
      result = result.filter((p) => p.degree_level === degreeLevel)
    }
    if (university !== 'all') {
      result = result.filter((p) => p.university === university)
    }
    return result
  }, [programs, degreeLevel, university])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-48">
          <Select
            aria-label="Filter by degree level"
            value={degreeLevel}
            onChange={(e) => setFilter('degree_level', e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="postgraduate">Postgraduate</option>
          </Select>
        </div>
        <div className="w-full sm:w-64">
          <Select
            aria-label="Filter by university"
            value={university}
            onChange={(e) => setFilter('university', e.target.value)}
          >
            <option value="all">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="w-6 h-6 text-text-400" />}
          heading="No programs found"
          description="Try adjusting your filters."
        />
      )}
    </div>
  )
}
