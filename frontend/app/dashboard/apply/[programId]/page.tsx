'use client'

import { useState } from 'react'
import { useWizard } from '@/lib/wizard-context'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EducationBlock, type EducationEntry } from '@/components/shared/EducationBlock'
import { LanguageBlock } from '@/components/shared/LanguageBlock'
import { DocumentUploadCard } from '@/components/shared/DocumentUploadCard'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  FileText,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { DocumentChecklistItem, ApplicationDocument, Application, Program } from '@/lib/api'

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

export default function WizardSectionPage() {
  const {
    currentSection,
    sections,
    completedSections,
    formData,
    application,
    program,
    documents,
    navigateToSection,
    updateSectionData,
    submitApplication,
    submitting,
    submittingPhase,
    submitError,
    refreshDocuments,
  } = useWizard()

  const section = sections.find((s) => s.id === currentSection)
  if (!section) return null

  function navigatePrev() {
    const idx = sections.findIndex((s) => s.id === currentSection)
    if (idx > 0) navigateToSection(sections[idx - 1].id)
  }

  function navigateNext() {
    const idx = sections.findIndex((s) => s.id === currentSection)
    if (idx < sections.length - 1) navigateToSection(sections[idx + 1].id)
  }

  const currentIdx = sections.findIndex((s) => s.id === currentSection)
  const isFirst = currentIdx === 0
  const isLast = currentIdx === sections.length - 1

  switch (currentSection) {
    case 'personal':
      return <PersonalSection formData={formData} updateSectionData={updateSectionData} navigateNext={navigateNext} />
    case 'contact':
      return <ContactSection formData={formData} updateSectionData={updateSectionData} navigatePrev={navigatePrev} navigateNext={navigateNext} />
    case 'education':
      return <EducationSection formData={formData} updateSectionData={updateSectionData} navigatePrev={navigatePrev} navigateNext={navigateNext} />
    case 'languages':
      return <LanguagesSection formData={formData} updateSectionData={updateSectionData} navigatePrev={navigatePrev} navigateNext={navigateNext} />
    case 'motivation':
      return <MotivationSection formData={formData} updateSectionData={updateSectionData} navigatePrev={navigatePrev} navigateNext={navigateNext} />
    case 'documents':
      return (
        <DocumentsSection
          documents={documents}
          application={application}
          refreshDocuments={refreshDocuments}
          navigatePrev={navigatePrev}
        />
      )
    case 'checklist':
      return (
        <ChecklistSection
          formData={formData}
          sections={sections}
          completedSections={completedSections}
          application={application}
          program={program}
          submitApplication={submitApplication}
          submitting={submitting}
          submittingPhase={submittingPhase}
          submitError={submitError}
          navigateToSection={navigateToSection}
        />
      )
    default:
      return null
  }
}

/* ───── Personal Information ───── */

function PersonalSection({
  formData,
  updateSectionData,
  navigateNext,
}: {
  formData: Record<string, unknown>
  updateSectionData: (id: string, data: unknown) => void
  navigateNext: () => void
}) {
  const d = (formData.personal as Record<string, string>) ?? {}

  function set(field: string, value: string) {
    updateSectionData('personal', { ...d, [field]: value })
  }

  function handleChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      set(field, e.target.value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900">Personal Information</h2>
        <p className="text-sm text-text-600 mt-1">
          Please provide your personal details as they appear on official documents.
        </p>
      </div>

      <Alert variant="info">
        Please enter your name exactly as it appears on your passport.
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FormField label="Given Name" htmlFor="given_name" required>
            <Input
              id="given_name"
              value={d.given_name ?? ''}
              onChange={handleChange('given_name')}
              placeholder="Your given name"
            />
          </FormField>

          <FormField label="Middle Name" htmlFor="middle_name">
            <Input
              id="middle_name"
              value={d.middle_name ?? ''}
              onChange={handleChange('middle_name')}
              placeholder="Optional"
            />
          </FormField>

          <FormField label="Family Name" htmlFor="family_name" required>
            <Input
              id="family_name"
              value={d.family_name ?? ''}
              onChange={handleChange('family_name')}
              placeholder="Your family name"
            />
          </FormField>

          <FormField label="Gender" htmlFor="gender" required>
            <Select
              id="gender"
              value={d.gender ?? ''}
              onChange={handleChange('gender')}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </Select>
          </FormField>

          <FormField label="Citizenship" htmlFor="citizenship" required>
            <Input
              id="citizenship"
              value={d.citizenship ?? ''}
              onChange={handleChange('citizenship')}
              placeholder="Country of citizenship"
            />
          </FormField>

          <FormField label="Country of Residence" htmlFor="country_of_residence" required>
            <Input
              id="country_of_residence"
              value={d.country_of_residence ?? ''}
              onChange={handleChange('country_of_residence')}
              placeholder="Country of residence"
            />
          </FormField>
        </div>

        <div className="space-y-4">
          <FormField label="Date of Birth" htmlFor="date_of_birth" required>
            <Input
              id="date_of_birth"
              type="date"
              value={d.date_of_birth ?? ''}
              onChange={handleChange('date_of_birth')}
            />
          </FormField>

          <FormField label="Place of Birth" htmlFor="place_of_birth">
            <Input
              id="place_of_birth"
              value={d.place_of_birth ?? ''}
              onChange={handleChange('place_of_birth')}
              placeholder="City, Country"
            />
          </FormField>

          <FormField
            label="Passport Number"
            htmlFor="passport_number"
            hint="As shown on your passport"
          >
            <Input
              id="passport_number"
              value={d.passport_number ?? ''}
              onChange={handleChange('passport_number')}
              placeholder="Passport number"
            />
          </FormField>

          <FormField label="Nationality" htmlFor="nationality">
            <Input
              id="nationality"
              value={d.nationality ?? ''}
              onChange={handleChange('nationality')}
              placeholder="Nationality"
            />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={navigateNext}>Next: Contact Details &rarr;</Button>
      </div>
    </div>
  )
}

/* ───── Contact Details ───── */

function ContactSection({
  formData,
  updateSectionData,
  navigatePrev,
  navigateNext,
}: {
  formData: Record<string, unknown>
  updateSectionData: (id: string, data: unknown) => void
  navigatePrev: () => void
  navigateNext: () => void
}) {
  const d = (formData.contact as Record<string, string>) ?? {}

  function set(field: string, value: string) {
    updateSectionData('contact', { ...d, [field]: value })
  }

  function handleChange(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      set(field, e.target.value)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900">Contact Details</h2>
        <p className="text-sm text-text-600 mt-1">
          How can the university reach you?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FormField label="Email Address" htmlFor="email">
            <div className="flex items-center gap-2 h-10 bg-background border border-border rounded px-3 text-sm text-text-600">
              <span className="flex-1 truncate">Email from account</span>
              <CheckCircle size={14} className="text-success shrink-0" />
            </div>
          </FormField>

          <FormField label="Street Address" htmlFor="street_address" required>
            <Input
              id="street_address"
              value={d.street_address ?? ''}
              onChange={handleChange('street_address')}
              placeholder="Street address"
            />
          </FormField>

          <FormField label="City / Town" htmlFor="city" required>
            <Input
              id="city"
              value={d.city ?? ''}
              onChange={handleChange('city')}
              placeholder="City or town"
            />
          </FormField>

          <FormField label="Postal Code" htmlFor="postal_code" required>
            <Input
              id="postal_code"
              value={d.postal_code ?? ''}
              onChange={handleChange('postal_code')}
              placeholder="Postal code"
            />
          </FormField>

          <FormField label="Country" htmlFor="country" required>
            <Select
              id="country"
              value={d.country ?? ''}
              onChange={handleChange('country')}
            >
              <option value="">Select country</option>
              <option value="ET">Ethiopia</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="KE">Kenya</option>
              <option value="ZA">South Africa</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
        </div>

        <div className="space-y-4">
          <FormField label="Country Code" htmlFor="mobile_country_code" required>
            <Select
              id="mobile_country_code"
              value={d.mobile_country_code ?? ''}
              onChange={handleChange('mobile_country_code')}
            >
              <option value="">Code</option>
              <option value="+251">+251 (Ethiopia)</option>
              <option value="+1">+1 (US/Canada)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+91">+91 (India)</option>
              <option value="+254">+254 (Kenya)</option>
              <option value="+27">+27 (South Africa)</option>
              <option value="+49">+49 (Germany)</option>
            </Select>
          </FormField>

          <FormField label="Mobile Number" htmlFor="mobile_number" required>
            <Input
              id="mobile_number"
              type="tel"
              value={d.mobile_number ?? ''}
              onChange={handleChange('mobile_number')}
              placeholder="Mobile number"
            />
          </FormField>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={navigatePrev}>&larr; Personal Information</Button>
        <Button onClick={navigateNext}>Next: Education &rarr;</Button>
      </div>
    </div>
  )
}

/* ───── Education ───── */

function EducationSection({
  formData,
  updateSectionData,
  navigatePrev,
  navigateNext,
}: {
  formData: Record<string, unknown>
  updateSectionData: (id: string, data: unknown) => void
  navigatePrev: () => void
  navigateNext: () => void
}) {
  const entries = (formData.education as EducationEntry[]) ?? []

  function setEntries(next: EducationEntry[]) {
    updateSectionData('education', next)
  }

  function handleChange(index: number, field: string, value: string) {
    const next = entries.map((e, i) =>
      i === index ? { ...e, [field]: value } : e,
    )
    setEntries(next)
  }

  function addEntry() {
    setEntries([...entries, {}])
  }

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...entries]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setEntries(next)
  }

  function moveDown(index: number) {
    if (index === entries.length - 1) return
    const next = [...entries]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setEntries(next)
  }

  function removeEntry(index: number) {
    setEntries(entries.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900">Education</h2>
        <p className="text-sm text-text-600 mt-1">
          List your educational background, starting with the most recent.
        </p>
      </div>

      {entries.length === 0 && (
        <Card padding="md">
          <p className="text-sm text-text-400 text-center py-4">
            No education entries yet. Add your first entry below.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {entries.map((entry, i) => (
          <EducationBlock
            key={i}
            entry={entry}
            index={i}
            totalCount={entries.length}
            onChange={handleChange}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onDelete={removeEntry}
          />
        ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={addEntry}
        icon={<Plus size={14} />}
      >
        Add education entry
      </Button>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={navigatePrev}>&larr; Contact Details</Button>
        <Button onClick={navigateNext}>Next: Languages &rarr;</Button>
      </div>
    </div>
  )
}

/* ───── Languages ───── */

function LanguagesSection({
  formData,
  updateSectionData,
  navigatePrev,
  navigateNext,
}: {
  formData: Record<string, unknown>
  updateSectionData: (id: string, data: unknown) => void
  navigatePrev: () => void
  navigateNext: () => void
}) {
  const d = (formData.languages as {
    native?: string
    foreign?: Array<Record<string, string>>
  }) ?? { foreign: [] }

  const foreign = d.foreign ?? []

  function updateLang(field: string, value: string) {
    updateSectionData('languages', { ...d, [field]: value })
  }

  function setForeign(next: Array<Record<string, string>>) {
    updateSectionData('languages', { ...d, foreign: next })
  }

  function handleChange(index: number, field: string, value: string) {
    const next = foreign.map((e, i) =>
      i === index ? { ...e, [field]: value } : e,
    )
    setForeign(next)
  }

  function addEntry() {
    setForeign([...foreign, {}])
  }

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...foreign]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setForeign(next)
  }

  function moveDown(index: number) {
    if (index === foreign.length - 1) return
    const next = [...foreign]
    ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
    setForeign(next)
  }

  function removeEntry(index: number) {
    setForeign(foreign.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900">Languages</h2>
        <p className="text-sm text-text-600 mt-1">
          Please describe your foreign language skills. If you have taken any relevant tests,
          list the tests and associated scores.
        </p>
      </div>

      <FormField label="Native Language" htmlFor="native_lang" required>
        <Select
          id="native_lang"
          value={d.native ?? ''}
          onChange={(e) => updateLang('native', e.target.value)}
        >
          <option value="">Select language</option>
          <option value="amharic">Amharic</option>
          <option value="english">English</option>
          <option value="french">French</option>
          <option value="arabic">Arabic</option>
          <option value="spanish">Spanish</option>
          <option value="german">German</option>
          <option value="other">Other</option>
        </Select>
      </FormField>

      <div className="space-y-4">
        {foreign.map((entry, i) => (
          <LanguageBlock
            key={i}
            entry={entry}
            index={i}
            totalCount={foreign.length}
            onChange={handleChange}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onDelete={removeEntry}
          />
        ))}
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={addEntry}
        icon={<Plus size={14} />}
      >
        Add language
      </Button>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={navigatePrev}>&larr; Education</Button>
        <Button onClick={navigateNext}>Next: Motivation &rarr;</Button>
      </div>
    </div>
  )
}

/* ───── Motivation ───── */

function MotivationSection({
  formData,
  updateSectionData,
  navigatePrev,
  navigateNext,
}: {
  formData: Record<string, unknown>
  updateSectionData: (id: string, data: unknown) => void
  navigatePrev: () => void
  navigateNext: () => void
}) {
  const d = (formData.motivation as { personal_statement?: string }) ?? {}
  const text = d.personal_statement ?? ''
  const charCount = text.length

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    updateSectionData('motivation', { personal_statement: e.target.value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900">Motivation</h2>
        <p className="text-sm text-text-600 mt-1">
          Please provide a personal statement explaining your motivation for applying to this
          program and how it relates to your academic background and career goals.
        </p>
      </div>

      <FormField label="Personal Statement" htmlFor="personal_statement">
        <Textarea
          id="personal_statement"
          rows={10}
          maxLength={3000}
          value={text}
          onChange={handleChange}
          placeholder="Your personal statement..."
        />
        <p
          className={`text-xs mt-1 ${
            charCount > 2700 ? 'text-warning' : 'text-text-400'
          }`}
        >
          {charCount}/3000
        </p>
      </FormField>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={navigatePrev}>&larr; Languages</Button>
        <Button onClick={navigateNext}>Next: Documents &rarr;</Button>
      </div>
    </div>
  )
}

/* ───── Documents ───── */

function DocumentsSection({
  documents,
  application,
  refreshDocuments,
  navigatePrev,
}: {
  documents: ApplicationDocument[]
  application: Application | null
  refreshDocuments: () => Promise<void>
  navigatePrev: () => void
}) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const checklist = (application?.document_checklist ?? []) as DocumentChecklistItem[]
  const appId = application?.id

  async function handleUpload(docType: string, file: File) {
    if (!appId) return
    setUploading(docType)
    setUploadError(null)

    try {
      const urlResp = await authFetch<{ upload_url: string | null; object_key: string }>(
        `applications/${appId}/documents/upload-url/`,
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
        `/api/proxy/applications/${appId}/documents/`,
        {
          method: 'POST',
          body: form,
        },
      )

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text.length > 200 ? 'Upload failed' : text)
      }

      await refreshDocuments()
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900">Documents</h2>
        <p className="text-sm text-text-600 mt-1">
          Please upload the required documents for this application. Accepted formats: PDF, JPG,
          PNG, DOC, DOCX. Maximum 10MB per file.
        </p>
      </div>

      {uploadError && (
        <Alert variant="danger">{uploadError}</Alert>
      )}

      {checklist.length === 0 ? (
        <Card padding="md">
          <p className="text-sm text-text-400 text-center py-4">
            No documents required for this program.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {checklist.map((item) => {
            const doc = documents.find(
              (d) => d.document_type === item.type,
            )
            return (
              <DocumentUploadCard
                key={item.type}
                item={item}
                document={doc ?? null}
                isUploading={uploading === item.type}
                onUpload={handleUpload}
              />
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={navigatePrev}>&larr; Motivation</Button>
      </div>
    </div>
  )
}

/* ───── Checklist ───── */

function ChecklistSection({
  formData,
  sections,
  completedSections,
  application,
  program,
  submitApplication,
  submitting,
  submittingPhase,
  submitError,
  navigateToSection,
}: {
  formData: Record<string, unknown>
  sections: Array<{ id: string; label: string; required: boolean }>
  completedSections: Set<string>
  application: Application | null
  program: Program | null
  submitApplication: () => Promise<void>
  submitting: boolean
  submittingPhase: string
  submitError: string | null
  navigateToSection: (id: string) => void
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const document_checklist = (application?.document_checklist ?? []) as DocumentChecklistItem[]

  const allDataSectionsComplete = sections
    .filter((s) => s.required && s.id !== 'checklist' && s.id !== 'documents')
    .every((s) => completedSections.has(s.id))

  const allDocumentsUploaded =
    document_checklist.length === 0 || document_checklist.every((d) => d.uploaded)

  const isReadyToSubmit = allDataSectionsComplete && allDocumentsUploaded

  function submitButtonLabel(): string {
    if (submittingPhase === 'creating_payment') return 'Creating payment...'
    if (submittingPhase === 'submitting') return 'Submitting...'
    if (submittingPhase === 'error') return 'Try Again'
    const amount = program?.fee_amount
    const currency = program?.fee_currency
    if (amount && currency) {
      return `Pay ${currency} ${amount} & Submit Application`
    }
    return 'Submit Application'
  }

  function sectionStatusIcon(sectionId: string) {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return null
    if (completedSections.has(sectionId)) {
      return { icon: CheckCircle, className: 'text-success' }
    }
    if (section.required) {
      return { icon: XCircle, className: 'text-danger' }
    }
    return { icon: AlertTriangle, className: 'text-warning' }
  }

  function documentStatus(item: DocumentChecklistItem) {
    if (!item.uploaded) return { icon: XCircle, className: 'text-danger', label: 'Not uploaded' }
    if (item.status === 'verified') return { icon: CheckCircle, className: 'text-success', label: 'Verified' }
    if (item.status === 'flagged') return { icon: XCircle, className: 'text-danger', label: 'Flagged' }
    return { icon: AlertTriangle, className: 'text-warning', label: 'Pending' }
  }

  const formSections = sections.filter(
    (s) => s.id !== 'checklist' && s.id !== 'documents',
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-text-900">Checklist</h2>
        <p className="text-sm text-text-600 mt-1">
          Review your application before submitting. All required items must be complete.
        </p>
      </div>

      {/* Section completion checklist */}
      <Card padding="md">
        <h3 className="text-base font-display font-semibold text-text-900 mb-3">Sections</h3>
        <div className="space-y-2">
          {formSections.map((section) => {
            const { icon: Icon, className } = sectionStatusIcon(section.id) ?? {}
            return (
              <button
                key={section.id}
                onClick={() => navigateToSection(section.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-background transition-colors text-left"
              >
                {Icon && <Icon size={16} className={className} />}
                <span className="text-sm text-text-900 flex-1">{section.label}</span>
                <span className="text-xs text-text-400">
                  {completedSections.has(section.id) ? 'Complete' : section.required ? 'Incomplete' : 'Optional'}
                </span>
              </button>
            )
          })}

          {/* Document checklist item inline */}
          <div className="flex items-center gap-3 px-3 py-2">
            {allDocumentsUploaded
              ? <CheckCircle size={16} className="text-success" />
              : <XCircle size={16} className="text-danger" />
            }
            <span className="text-sm text-text-900 flex-1">Documents</span>
            <span className="text-xs text-text-400">
              {allDocumentsUploaded ? 'Complete' : 'Incomplete'}
            </span>
          </div>
        </div>
      </Card>

      {/* Document checklist */}
      {document_checklist.length > 0 && (
        <Card padding="md">
          <h3 className="text-base font-display font-semibold text-text-900 mb-3">Uploaded Documents</h3>
          <div className="space-y-2">
            {document_checklist.map((item) => {
              const { icon: Icon, className, label } = documentStatus(item)
              return (
                <div key={item.type} className="flex items-center gap-3 px-3 py-2">
                  <Icon size={16} className={className} />
                  <span className="text-sm text-text-900 flex-1">{item.label}</span>
                  <span className="text-xs text-text-400">{label}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Readiness banner */}
      {isReadyToSubmit ? (
        <Alert variant="success">Your application is ready to submit.</Alert>
      ) : (
        <Alert variant="danger">
          Please complete all required sections before submitting.
        </Alert>
      )}

      {submitError && (
        <Alert variant="danger">{submitError}</Alert>
      )}

      {/* Submit button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full mt-6"
        disabled={!isReadyToSubmit || submitting}
        loading={submitting}
        onClick={() => setShowConfirm(true)}
      >
        {submitButtonLabel()}
      </Button>

      {/* Confirmation modal */}
      <Modal
        open={showConfirm}
        onClose={() => !submitting && setShowConfirm(false)}
        title="Confirm Submission"
      >
        <p className="text-sm text-text-600 mb-4">
          Submit your application to{' '}
          <strong>{program?.name}</strong>?
          This will charge the application fee.
        </p>
        {submitError && (
          <Alert variant="danger" className="mb-4">{submitError}</Alert>
        )}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={() => {
              submitApplication()
            }}
          >
            {submittingPhase === 'creating_payment'
              ? 'Processing Payment...'
              : 'Confirm & Submit'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
