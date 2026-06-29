'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WizardContext, type FormData, type Section, type SaveState, type WizardContextValue } from '@/lib/wizard-context'
import { WizardTopBar } from '@/components/shared/WizardTopBar'
import { WizardSidebar } from '@/components/shared/WizardSidebar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { getErrorMessage } from '@/lib/api'
import type {
  Application,
  ApplicationDocument,
  PaginatedResponse,
  Program,
} from '@/lib/api'

const SECTIONS: Section[] = [
  { id: 'personal', label: 'Personal Information', required: true },
  { id: 'contact', label: 'Contact Details', required: true },
  { id: 'education', label: 'Education', required: true },
  { id: 'languages', label: 'Languages', required: false },
  { id: 'motivation', label: 'Motivation', required: false },
  { id: 'documents', label: 'Documents', required: true },
  { id: 'checklist', label: 'Checklist', required: false },
]

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `/api/proxy/${path.replace(/^\//, '')}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text.length > 200 ? `HTTP ${res.status}` : text || `HTTP ${res.status}`
    try {
      const json = JSON.parse(text)
      const extracted = json?.detail || json?.message || json?.error?.message || json?.error
      if (extracted) msg = String(extracted)
    } catch {}
    throw new Error(msg)
  }
  return res.json()
}

function isSectionComplete(sectionId: string, formData: FormData, app: Application | null): boolean {
  if (sectionId === 'checklist') return true

  if (sectionId === 'documents') {
    const checklist = app?.document_checklist
    if (!checklist || checklist.length === 0) return true
    return checklist.every((d) => d.uploaded)
  }

  switch (sectionId) {
    case 'personal': {
      const d = formData.personal as Record<string, string> | undefined
      return !!(d?.given_name && d?.family_name && d?.gender && d?.citizenship && d?.country_of_residence && d?.date_of_birth)
    }
    case 'contact': {
      const d = formData.contact as Record<string, string> | undefined
      return !!(d?.street_address && d?.city && d?.postal_code && d?.country && d?.mobile_country_code && d?.mobile_number)
    }
    case 'education': {
      const arr = formData.education as Array<Record<string, string>> | undefined
      return Array.isArray(arr) && arr.some((e) => e?.level && e?.institution && e?.country)
    }
    case 'languages': {
      const d = formData.languages as Record<string, unknown> | undefined
      return !!(d?.native)
    }
    case 'motivation': {
      const d = formData.motivation as Record<string, string> | undefined
      return !!(d?.personal_statement?.trim())
    }
    default:
      return false
  }
}

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const programId = params.programId as string
  const cycleId = searchParams.get('cycle')
  const sectionParam = searchParams.get('section')

  const isConfirmation = pathname.endsWith('/confirmation')

  const [program, setProgram] = useState<Program | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [formData, setFormData] = useState<FormData>({})
  const [documents, setDocuments] = useState<ApplicationDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [submitting, setSubmitting] = useState(false)
  const [submittingPhase, setSubmittingPhase] = useState<'idle' | 'creating_payment' | 'submitting' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const initialized = useRef(false)
  const formDataRef = useRef<FormData>({})
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSection = sectionParam && SECTIONS.some((s) => s.id === sectionParam)
    ? sectionParam
    : 'personal'

  // Initialization
  useEffect(() => {
    if (initialized.current || isConfirmation) return

    async function init() {
      if (!cycleId) {
        setError('No admission cycle selected. Please return to the program page and select a cycle.')
        setLoading(false)
        return
      }

      try {
        const [prog, appsResp] = await Promise.all([
          authFetch<Program>(`programs/${programId}/`),
          authFetch<PaginatedResponse<Application>>('applicants/me/applications/'),
        ])
        setProgram(prog)

        const draft = appsResp.results.find(
          (a) =>
            a.program === programId &&
            a.admission_cycle === cycleId &&
            a.status === 'draft',
        )

        let app: Application
        if (draft) {
          app = draft
        } else {
          app = await authFetch<Application>('applications/', {
            method: 'POST',
            body: JSON.stringify({
              program: programId,
              admission_cycle: cycleId,
            }),
          })
        }

        setApplication(app)
        const fd = (app.form_data as FormData) || {}
        setFormData(fd)
        formDataRef.current = fd

        // Load documents
        try {
          const docs = await authFetch<ApplicationDocument[]>(
            `applications/${app.id}/documents/`,
            { method: 'GET' },
          )
          setDocuments(docs ?? [])
        } catch {
          // documents may not exist yet
        }

        initialized.current = true
      } catch (e) {
        const msg = getErrorMessage(e)
        if (msg.includes('permission') || msg.includes('403') || msg.includes('Forbidden')) {
          setError('Cannot create application. Make sure your email is verified.')
        } else if (msg.includes('CYCLE_CLOSED') || msg.includes('closed') || msg.includes('archived')) {
          setError('This admission cycle is closed. Please select another cycle.')
        } else {
          setError(msg || 'Failed to load application. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [programId, cycleId])

  // Compute completed sections
  const completedSections = useMemo(() => {
    const completed = new Set<string>()
    for (const section of SECTIONS) {
      if (section.id === 'checklist') continue
      if (isSectionComplete(section.id, formData, application)) {
        completed.add(section.id)
      }
    }
    return completed
  }, [formData, application])

  // Navigation
  const navigateToSection = useCallback(
    (sectionId: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('section', sectionId)
      router.push(`/dashboard/apply/${programId}?${params.toString()}`)
    },
    [programId, router, searchParams],
  )

  // Save
  const executeSave = useCallback(
    async (data: FormData) => {
      if (!application?.id) return
      setSaveState('saving')
      try {
        const updated = await authFetch<Application>(
          `applications/${application.id}/`,
          {
            method: 'PATCH',
            body: JSON.stringify({ form_data: data }),
          },
        )
        setApplication(updated)
        formDataRef.current = data
        setSaveState('saved')
        setIsDirty(false)
      } catch {
        setSaveState('unsaved')
      }
    },
    [application?.id],
  )

  const updateSectionData = useCallback(
    (sectionId: string, data: unknown) => {
      const next = { ...formDataRef.current, [sectionId]: data }
      formDataRef.current = next
      setFormData(next)
      setIsDirty(true)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => executeSave(next), 2000)
    },
    [executeSave],
  )

  const save = useCallback(async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    await executeSave(formDataRef.current)
  }, [executeSave])

  // Refresh
  const refreshApplication = useCallback(async () => {
    if (!application?.id) return
    try {
      const app = await authFetch<Application>(`applications/${application.id}/`)
      setApplication(app)
      const fd = (app.form_data as FormData) || {}
      setFormData(fd)
      formDataRef.current = fd
    } catch {
      // ignore
    }
  }, [application?.id])

  const refreshDocuments = useCallback(async () => {
    if (!application?.id) return
    try {
      const docs = await authFetch<ApplicationDocument[]>(
        `applications/${application.id}/documents/`,
        { method: 'GET' },
      )
      setDocuments(docs ?? [])
      await refreshApplication()
    } catch {
      // ignore
    }
  }, [application?.id, refreshApplication])

  // Submit
  const submitApplication = useCallback(async () => {
    if (!application?.id || submitting) return
    setSubmitError(null)
    setSubmitting(true)
    setSubmittingPhase('creating_payment')
    try {
      await authFetch(`applications/${application.id}/payment-intent/`, {
        method: 'POST',
      })
      setSubmittingPhase('submitting')
      await authFetch(`applications/${application.id}/submit/`, {
        method: 'POST',
      })
      setSubmittingPhase('success')
      router.push(`/dashboard/apply/${programId}/confirmation?appId=${application.id}`)
    } catch (e) {
      const msg = getErrorMessage(e)
      if (msg.includes('CYCLE_CLOSED') || msg.includes('closed') || msg.includes('archived')) {
        setSubmitError('This admission cycle is closed. Applications are no longer being accepted.')
      } else if (msg.includes('MISSING_DOCS')) {
        setSubmitError('Not all required documents have been uploaded. Please check the Documents section.')
      } else if (msg.includes('PAYMENT_REQUIRED')) {
        setSubmitError('Payment is required before submitting. Please try again.')
      } else {
        setSubmitError(msg.length > 200 ? 'Submission failed. Please try again.' : msg)
      }
      setSubmittingPhase('error')
    } finally {
      setSubmitting(false)
    }
  }, [application?.id, programId, router, submitting])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  function handleDocumentUpload(type: string, file: File) {
    if (!application?.id) return
    uploadDocument(type, file)
  }

  async function uploadDocument(docType: string, file: File) {
    if (!application?.id) return

    try {
      const urlResp = await authFetch<{ upload_url: string | null; object_key: string }>(
        `applications/${application.id}/documents/upload-url/`,
        {
          method: 'POST',
          body: JSON.stringify({ document_type: docType }),
        },
      )

      const form = new FormData()
      form.append('document_type', docType)
      form.append('file', file)
      form.append('object_key', urlResp.object_key)

      const res = await fetch(
        `/api/proxy/applications/${application.id}/documents/`,
        {
          method: 'POST',
          body: form,
        },
      )

      if (!res.ok) {
        const text = await res.text()
        let msg = text.length > 200 ? 'Upload failed' : text || 'Upload failed'
        try {
          const json = JSON.parse(text)
          const extracted = json?.detail || json?.message || json?.error?.message || json?.error
          if (extracted) msg = String(extracted)
        } catch {}
        throw new Error(msg)
      }

      await refreshDocuments()
    } catch (e) {
      setFormData((prev) => ({ ...prev }))
      throw e
    }
  }

  const contextValue = useMemo<WizardContextValue>(
    () => ({
      program,
      application,
      sections: SECTIONS,
      currentSection,
      formData,
      completedSections,
      documents,
      loading,
      error,
      isDirty,
      saveState,
      submitting,
      submittingPhase,
      submitError,
      navigateToSection,
      updateSectionData,
      save,
      refreshDocuments,
      refreshApplication,
      submitApplication,
    }),
    [
      program,
      application,
      currentSection,
      formData,
      completedSections,
      documents,
      loading,
      error,
      isDirty,
      saveState,
      submitting,
      submittingPhase,
      submitError,
      navigateToSection,
      updateSectionData,
      save,
      refreshDocuments,
      refreshApplication,
      submitApplication,
    ],
  )

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="danger">{error}</Alert>
        <Link href="/dashboard">
          <Button variant="ghost">&larr; Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  // No program
  if (!program) {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="info">Program not found.</Alert>
        <Link href="/dashboard">
          <Button variant="ghost">&larr; Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  if (isConfirmation) {
    return <>{children}</>
  }

  return (
    <WizardContext.Provider value={contextValue}>
      <WizardTopBar />
      <div className="flex">
        <WizardSidebar />
        <main className="flex-1 max-w-2xl mx-auto w-full py-8 px-4 sm:px-6">
          {children}
        </main>
      </div>
    </WizardContext.Provider>
  )
}
