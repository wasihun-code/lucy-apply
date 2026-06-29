'use client'

import { useWizard } from '@/lib/wizard-context'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Circle } from 'lucide-react'

export function WizardSidebar() {
  const { sections, currentSection, completedSections, navigateToSection } = useWizard()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[220px] md:flex-col md:shrink-0">
        <nav className="space-y-0.5 py-4 px-2">
          {sections.map((section) => {
            const isActive = currentSection === section.id
            const isCompleted = completedSections.has(section.id)

            let statusIcon: React.ReactNode
            let statusClass: string

            if (isActive) {
              statusIcon = <Circle size={14} className="text-primary" />
              statusClass = 'bg-primary-soft text-primary font-medium border-r-2 border-primary'
            } else if (isCompleted) {
              statusIcon = <CheckCircle size={14} className="text-success" />
              statusClass = 'text-text-600 hover:bg-background hover:text-text-900'
            } else if (!section.required) {
              statusIcon = <AlertCircle size={14} className="text-warning" />
              statusClass = 'text-text-400 hover:bg-background hover:text-text-600'
            } else {
              statusIcon = <AlertCircle size={14} className="text-danger" />
              statusClass = 'text-text-600 hover:bg-background hover:text-text-900'
            }

            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-r transition-colors text-left',
                  statusClass,
                )}
              >
                <span className="shrink-0">{statusIcon}</span>
                <span className="truncate">{section.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Mobile horizontal tab strip */}
      <div className="md:hidden overflow-x-auto border-b border-border bg-surface">
        <div className="flex px-2 gap-1 min-w-0">
          {sections.map((section) => {
            const isActive = currentSection === section.id
            const isCompleted = completedSections.has(section.id)

            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(section.id)}
                className={cn(
                  'shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-400 hover:text-text-600',
                )}
              >
                {shortLabel(section.label)}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function shortLabel(label: string): string {
  const map: Record<string, string> = {
    'Personal Information': 'Personal',
    'Contact Details': 'Contact',
    Education: 'Education',
    Languages: 'Languages',
    Motivation: 'Motivation',
    Documents: 'Documents',
    Checklist: 'Checklist',
  }
  return map[label] ?? label
}
