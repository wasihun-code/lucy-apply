'use client'

import { createContext, useContext } from 'react'
import type {
  Application,
  ApplicationDocument,
  Program,
} from '@/lib/api'

export type FormData = Record<string, unknown>

export type Section = {
  id: string
  label: string
  required: boolean
}

export type SaveState = 'saved' | 'saving' | 'unsaved'

export type WizardContextValue = {
  program: Program | null
  application: Application | null
  sections: Section[]
  currentSection: string
  formData: FormData
  completedSections: Set<string>
  documents: ApplicationDocument[]
  loading: boolean
  error: string | null
  isDirty: boolean
  saveState: SaveState
  submitting: boolean
  submittingPhase: 'idle' | 'creating_payment' | 'submitting' | 'success' | 'error'
  submitError: string | null

  navigateToSection: (sectionId: string) => void
  updateSectionData: (sectionId: string, data: unknown) => void
  save: () => Promise<void>
  refreshDocuments: () => Promise<void>
  refreshApplication: () => Promise<void>
  submitApplication: () => Promise<void>
}

export const WizardContext = createContext<WizardContextValue | null>(null)

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext)
  if (!ctx) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return ctx
}
