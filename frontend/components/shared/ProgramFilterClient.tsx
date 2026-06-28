'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
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
}

const tabs = [
  { key: 'all', label: 'All' },
  { key: 'undergraduate', label: 'Undergraduate' },
  { key: 'postgraduate', label: 'Postgraduate' },
] as const

type TabKey = (typeof tabs)[number]['key']

export function ProgramFilterClient({ programs }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const filtered =
    activeTab === 'all'
      ? programs
      : programs.filter((p) => p.degree_level === activeTab)

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-400 hover:text-text-600',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      ) : (
        <EmptyState heading="No programs available" />
      )}
    </div>
  )
}
