'use client'

import Link from 'next/link'
import { useWizard } from '@/lib/wizard-context'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

export function WizardTopBar() {
  const {
    program,
    isDirty,
    saveState,
    save,
    submitting,
    navigateToSection,
  } = useWizard()

  return (
    <div className="sticky top-0 z-10 bg-surface border-b border-border">
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="text-sm text-text-400 hover:text-text-600 transition-colors shrink-0"
          >
            &larr; Dashboard
          </Link>
          {program && (
            <>
              <span className="text-text-400 hidden sm:inline">|</span>
              <div className="min-w-0 hidden sm:block">
                <p className="text-sm font-medium text-text-900 truncate">
                  {program.name}
                </p>
                <p className="text-xs text-text-400 truncate">
                  {program.university_name}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-text-400">
              <Spinner size={12} />
              Saving...
            </span>
          )}
          {saveState === 'saved' && !isDirty && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 size={12} />
              Saved
            </span>
          )}
          {isDirty && saveState !== 'saving' && (
            <span className="flex items-center gap-1 text-xs text-warning">
              <AlertTriangle size={12} />
              Unsaved changes
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={save}
            loading={saveState === 'saving'}
          >
            Save
          </Button>

          <Button
            variant="primary"
            size="sm"
            loading={submitting}
            onClick={() => navigateToSection('checklist')}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Mobile: program name below top bar */}
      {program && (
        <div className="sm:hidden px-4 pb-2">
          <p className="text-sm font-medium text-text-900 truncate">
            {program.name}
          </p>
          <p className="text-xs text-text-400 truncate">
            {program.university_name}
          </p>
        </div>
      )}
    </div>
  )
}
