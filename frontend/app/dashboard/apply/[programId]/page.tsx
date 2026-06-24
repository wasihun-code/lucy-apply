'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type {
  Application,
  ApplicationDocument,
  DocumentChecklistItem,
  PaginatedResponse,
  Program,
  AdmissionCycle,
  UploadUrlResponse,
  PaymentIntentResponse,
} from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

function apiUrl(path: string): string {
  return `${API_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function getToken(): string | null {
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1] ?? null
  )
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

export default function ApplyPage({ params }: { params: { programId: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cycleParam = searchParams.get('cycle')
  const resumingRef = useRef(false)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [program, setProgram] = useState<Program | null>(null)
  const [myApps, setMyApps] = useState<Application[]>([])
  const [selectedCycle, setSelectedCycle] = useState<string>(cycleParam || '')
  const [application, setApplication] = useState<Application | null>(null)

  const [formData, setFormData] = useState<Record<string, string>>({})
  const [documents, setDocuments] = useState<ApplicationDocument[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<false | 'creating_payment' | 'submitting' | 'polling_payment' | 'success' | 'error'>(false);
  const [submitError, setSubmitError] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }

    async function init() {
      try {
        const [prog, appsResp] = await Promise.all([
          authFetch<Program>(`programs/${params.programId}/`),
          authFetch<PaginatedResponse<Application>>('applications/'),
        ])
        setProgram(prog)
        setMyApps(appsResp.results)

        if (!cycleParam && prog.open_cycles.length === 1) {
          setSelectedCycle(prog.open_cycles[0].id)
        }
      } catch (e) {
        setError('Failed to load program details.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [params.programId, cycleParam, router])

  useEffect(() => {
    if (!selectedCycle || loading || resumingRef.current) return

    const existing = myApps.find(
      (a) => a.program === params.programId && a.admission_cycle === selectedCycle && a.status === 'draft'
    )
    if (existing) {
      resumingRef.current = true
      setApplication(existing)
      setFormData((existing.form_data as Record<string, string>) || {})
      return
    }

    async function createApp() {
      try {
        const app = await authFetch<Application>('applications/', {
          method: 'POST',
          body: JSON.stringify({
            program: params.programId,
            admission_cycle: selectedCycle,
          }),
        })
        resumingRef.current = true
        setApplication(app)
        setFormData(
          (app.form_data as Record<string, string>) || {}
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('permission') || msg.includes('403') || msg.includes('Forbidden')) {
          setError('Cannot create application. Make sure your email is verified (check your inbox or re-register).')
        } else {
          setError('Failed to create application.')
        }
      }
    }
    createApp()
  }, [selectedCycle, params.programId, myApps, loading])

  useEffect(() => {
    const appId = application?.id
    if (!appId) return

    async function loadApp() {
      try {
        const app = await authFetch<Application>(`applications/${appId}/`)
        setApplication(app)
        setFormData((app.form_data as Record<string, string>) || {})
      } catch {
        // ignore
      }
    }

    loadApp()
  }, [application?.id])

  const autoSave = useCallback(
    (data: Record<string, string>) => {
      if (!application?.id) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        setSaving(true)
        try {
          const app = await authFetch<Application>(`applications/${application?.id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ form_data: data }),
          })
          setApplication(app)
        } catch {
          // silent fail on auto-save
        } finally {
          setSaving(false)
        }
      }, 600)
    },
    [application?.id]
  )

  function handleFieldChange(field: string, value: string) {
    const next = { ...formData, [field]: value }
    setFormData(next)
    autoSave(next)
  }

  async function refreshApplication() {
    if (!application?.id) return
    try {
      const app = await authFetch<Application>(`applications/${application?.id}/`)
      setApplication(app)
    } catch {
      // ignore
    }
  }

  async function refreshDocuments() {
    if (!application?.id) return
    try {
      const docs = await authFetch<ApplicationDocument[]>(
        `applications/${application?.id}/documents/`,
        { method: 'GET' }
      )
      setDocuments(docs)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (application?.id && step === 2) {
      refreshDocuments()
    }
  }, [application?.id, step])

  async function handlePayAndSubmit() {
    if (!application?.id || submitting) return
    setSubmitError(null)
    setSubmitting('creating_payment')
    try {
      await authFetch<PaymentIntentResponse>(
        `applications/${application.id}/payment-intent/`,
        { method: 'POST' }
      )
      setSubmitting('submitting')
      await authFetch<Application>(
        `applications/${application.id}/submit/`,
        { method: 'POST' }
      )
      router.push(`/dashboard/applications/${application.id}/confirmation`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Submission failed'
      setSubmitError(msg)
      setSubmitting('error')
    }
  }

  async function handleUpload(docType: string) {
    if (!application?.id) return
    setUploading(docType)

    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

    fileInput.onchange = async () => {
      const file = fileInput.files?.[0]
      if (!file) {
        setUploading(null)
        return
      }

      try {
        const urlResp = await authFetch<UploadUrlResponse>(
          `applications/${application?.id}/documents/upload-url/`,
          {
            method: 'POST',
            body: JSON.stringify({ document_type: docType }),
          }
        )

        const form = new FormData()
        form.append('document_type', docType)
        form.append('file', file)
        form.append('object_key', urlResp.object_key)

        const token = getToken()
        const res = await fetch(apiUrl(`applications/${application?.id}/documents/`), {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `Upload failed: HTTP ${res.status}`)
        }

        await refreshApplication()
        await refreshDocuments()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(null)
      }
    }

    fileInput.click()
  }

  if (loading) {
    return (
      <div>
        <p>Loading program details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1>Error</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>
    )
  }

  if (!program) {
    return (
      <div>
        <p>Program not found.</p>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>
    )
  }

  if (!selectedCycle) {
    return (
      <div>
        <Link href={`/universities/${program.university}/programs/${program.id}`} style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>
          &larr; Back to Program
        </Link>
        <h1>Apply to {program.name}</h1>
        <h2 style={{ fontSize: '1rem', color: '#666' }}>Select Admission Cycle</h2>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
          {program.open_cycles.map((cycle: AdmissionCycle) => (
            <button
              key={cycle.id}
              onClick={() => setSelectedCycle(cycle.id)}
              style={{
                padding: '0.75rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                background: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '1rem',
              }}
            >
              <strong>{cycle.name}</strong>
              <br />
              <span style={{ fontSize: '0.8rem', color: '#666' }}>
                Open: {new Date(cycle.open_date).toLocaleDateString()} &ndash;{' '}
                {new Date(cycle.close_date).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (!application) {
    return (
      <div>
        <p>Creating your application...</p>
      </div>
    )
  }

  const checklist: DocumentChecklistItem[] = application.document_checklist || []

  return (
    <div>
      <Link href="/dashboard" style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>
        &larr; Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Apply: {program.name}</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666' }}>{program.university_name}</p>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            background: saving ? '#fff3cd' : '#d1e7dd',
            color: saving ? '#664d03' : '#0f5132',
          }}
        >
          {saving ? 'Saving...' : 'Saved'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            background: step === 1 ? '#0d6efd' : '#e9ecef',
            color: step === 1 ? '#fff' : '#666',
            fontWeight: step === 1 ? 'bold' : 'normal',
            fontSize: '0.85rem',
          }}
        >
          Step 1: Application Form
        </div>
        <div
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            background: step === 2 ? '#0d6efd' : '#e9ecef',
            color: step === 2 ? '#fff' : '#666',
            fontWeight: step === 2 ? 'bold' : 'normal',
            fontSize: '0.85rem',
          }}
        >
          Step 2: Documents
        </div>
        <div
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            background: step === 3 ? '#0d6efd' : '#e9ecef',
            color: step === 3 ? '#fff' : '#666',
            fontWeight: step === 3 ? 'bold' : 'normal',
            fontSize: '0.85rem',
          }}
        >
          Step 3: Review &amp; Submit
        </div>
      </div>

      {step === 1 && (
        <section>
          <h2>Personal Information</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Full Name *</label>
              <input
                type="text"
                value={formData['full_name'] || ''}
                onChange={(e) => handleFieldChange('full_name', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Phone Number</label>
              <input
                type="tel"
                value={formData['phone'] || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
                placeholder="+251..."
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Nationality</label>
              <input
                type="text"
                value={formData['nationality'] || ''}
                onChange={(e) => handleFieldChange('nationality', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
                placeholder="Your nationality"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Date of Birth</label>
              <input
                type="date"
                value={formData['date_of_birth'] || ''}
                onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Personal Statement</label>
              <textarea
                value={formData['personal_statement'] || ''}
                onChange={(e) => handleFieldChange('personal_statement', e.target.value)}
                rows={5}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }}
                placeholder="Write a brief personal statement..."
              />
            </div>
          </div>
          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#0d6efd',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              Next: Documents &rarr;
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2>Required Documents</h2>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            Upload the required documents for this program. Supported formats: PDF, JPG, PNG, DOC, DOCX.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem', maxWidth: '500px' }}>
            {checklist.map((item) => {
              const doc = documents.find((d) => d.document_type === item.type)
              const isUploading = uploading === item.type
              return (
                <div
                  key={item.type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    background: item.uploaded ? '#f0f9ff' : '#fff',
                  }}
                >
                  <div>
                    <strong>{item.label}</strong>
                    <br />
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: item.uploaded
                          ? item.status === 'verified'
                            ? '#198754'
                            : item.status === 'flagged'
                            ? '#dc3545'
                            : '#856404'
                          : '#999',
                      }}
                    >
                      {item.uploaded
                        ? item.status === 'verified'
                          ? 'Verified'
                          : item.status === 'flagged'
                          ? 'Flagged — re-upload required'
                          : 'Pending review'
                        : 'Not uploaded'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUpload(item.type)}
                    disabled={isUploading}
                    style={{
                      padding: '0.4rem 0.8rem',
                      background: isUploading ? '#e9ecef' : item.uploaded ? '#ffc107' : '#0d6efd',
                      color: isUploading ? '#666' : '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isUploading ? 'Uploading...' : item.uploaded ? 'Re-upload' : 'Upload'}
                  </button>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              &larr; Back to Form
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!allUploaded(checklist)}
              style={{
                padding: '0.6rem 1.5rem',
                background: allUploaded(checklist) ? '#198754' : '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: allUploaded(checklist) ? 'pointer' : 'not-allowed',
              }}
            >
              Next: Review &amp; Submit &rarr;
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2>Review &amp; Submit</h2>

          <div style={{ maxWidth: '500px', marginTop: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem' }}>Program</h3>
              <p style={{ margin: 0 }}>{program.name}</p>
              <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.85rem' }}>{program.university_name}</p>
            </div>

            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem' }}>Documents</h3>
              {checklist.map((item) => (
                <p key={item.type} style={{ margin: '0.25rem 0', fontSize: '0.9rem' }}>
                  {item.label}:{' '}
                  <span style={{ color: item.status === 'verified' ? '#198754' : '#856404' }}>
                    {item.status === 'verified' ? 'Verified' : 'Pending review'}
                  </span>
                </p>
              ))}
            </div>

            <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem' }}>Application Fee</h3>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                {program.fee_currency} {program.fee_amount}
              </p>
            </div>
          </div>

          {submitError && (
            <div style={{ color: '#dc3545', marginBottom: '1rem', padding: '0.5rem', background: '#f8d7da', borderRadius: '4px' }}>
              {submitError}
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => setStep(2)}
              disabled={!!submitting}
              style={{
                padding: '0.6rem 1.5rem',
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: !!submitting ? 'not-allowed' : 'pointer',
              }}
            >
              &larr; Back to Documents
            </button>
            <button
              onClick={handlePayAndSubmit}
              disabled={!!submitting}
              style={{
                padding: '0.6rem 1.5rem',
                background: submitting && submitting !== 'error' ? '#6c757d' : '#198754',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                cursor: submitting && submitting !== 'error' ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting === 'creating_payment'
                ? 'Creating payment...'
                : submitting === 'submitting'
                ? 'Submitting...'
                : submitting === 'error'
                ? 'Try Again'
                : `Pay ${program.fee_currency} ${program.fee_amount} & Submit`}
            </button>
          </div>
        </section>
      )}

    </div>
  )
}

function allUploaded(checklist: DocumentChecklistItem[]): boolean {
  return checklist.length > 0 && checklist.every((item) => item.uploaded)
}
