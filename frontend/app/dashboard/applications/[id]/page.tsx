'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import type {
  Application,
  ApplicationDocument,
  DocumentChecklistItem,
  HistoryItem,
  UploadUrlResponse,
} from '@/lib/api'

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
    const msg = text.length > 200 ? `HTTP ${res.status}` : text || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [application, setApplication] = useState<Application | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [documents, setDocuments] = useState<ApplicationDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [responding, setResponding] = useState<'accepted' | 'declined' | null>(null)
  const [respondError, setRespondError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const me = await getMe()
      if (!me) {
        router.push('/login?redirect=' + encodeURIComponent(window.location.pathname))
        return
      }

      try {
        const [app, hist] = await Promise.all([
          authFetch<Application>(`applications/${params.id}/`),
          authFetch<HistoryItem[]>(`applications/${params.id}/history/`),
        ])
        setApplication(app)
        setHistory(hist || [])

        const docs = await authFetch<ApplicationDocument[]>(
          `applications/${params.id}/documents/`,
          { method: 'GET' }
        )
        setDocuments(docs || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load application')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  async function refreshApplication() {
    if (!params.id) return
    try {
      const app = await authFetch<Application>(`applications/${params.id}/`)
      setApplication(app)
    } catch {
      // ignore
    }
  }

  const checklist: DocumentChecklistItem[] = application?.document_checklist || []

  async function handleOfferResponse(response: 'accepted' | 'declined') {
    if (!application?.id || responding) return
    setResponding(response)
    setRespondError(null)
    try {
      const updated = await authFetch<Application>(
        `applications/${application.id}/offer-response/`,
        {
          method: 'POST',
          body: JSON.stringify({ response }),
        }
      )
      setApplication(updated)
      setHistory([
        ...history,
        {
          from_status: 'admitted',
          to_status: response,
          changed_by_type: 'applicant',
          reason: `Applicant ${response} the offer`,
          created_at: new Date().toISOString(),
        },
      ])
    } catch (e) {
      setRespondError(e instanceof Error ? e.message : 'Failed to respond')
    } finally {
      setResponding(null)
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
          `applications/${application.id}/documents/upload-url/`,
          {
            method: 'POST',
            body: JSON.stringify({ document_type: docType }),
          }
        )

        const form = new FormData()
        form.append('document_type', docType)
        form.append('file', file)
        form.append('object_key', urlResp.object_key)

        const res = await fetch(`/api/proxy/applications/${application.id}/documents/`, {
          method: 'POST',
          body: form,
        })

        if (!res.ok) {
          const text = await res.text()
          const msg = text.length > 200 ? `Upload failed: HTTP ${res.status}` : text || `Upload failed: HTTP ${res.status}`
          throw new Error(msg)
        }

        await refreshApplication()
        const docs = await authFetch<ApplicationDocument[]>(
          `applications/${application.id}/documents/`,
          { method: 'GET' }
        )
        setDocuments(docs || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(null)
      }
    }

    fileInput.click()
  }

  if (loading) {
    return <p>Loading...</p>
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

  if (!application) {
    return (
      <div>
        <p>Application not found.</p>
        <Link href="/dashboard">Back to Dashboard</Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/dashboard" style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>
        &larr; Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>{application.program_name}</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666' }}>{application.university_name}</p>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            padding: '0.3rem 0.6rem',
            borderRadius: '4px',
            background: statusBg(application.status),
            color: statusColor(application.status),
            fontWeight: 600,
          }}
        >
          {application.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Application Data */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Application Data</h2>
        <div style={{ maxWidth: '500px' }}>
          {Object.entries(application.form_data || {}).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px' }}>
              <strong style={{ fontSize: '0.8rem', color: '#666', textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </strong>
              <p style={{ margin: '0.25rem 0 0' }}>{String(value)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Documents */}
      <section style={{ marginTop: '2rem' }}>
        <h2>Documents</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '500px' }}>
          {checklist.length === 0 ? (
            <p style={{ color: '#666' }}>No documents required for this program.</p>
          ) : (
            checklist.map((item) => {
              const isUploading = uploading === item.type
              const flaggedDoc = item.status === 'flagged'
                ? documents.find((d) => d.document_type === item.type && d.status === 'flagged')
                : null
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
                    <span style={{ fontSize: '0.8rem', color: docStatusColor(item) }}>
                      {docStatusLabel(item, flaggedDoc)}
                    </span>
                  </div>
                  {flaggedDoc ? (
                    <button
                      onClick={() => handleUpload(item.type)}
                      disabled={isUploading}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: isUploading ? '#e9ecef' : '#ffc107',
                        color: isUploading ? '#666' : '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isUploading ? 'Uploading...' : 'Re-upload'}
                    </button>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Decision Notice */}
      {['admitted', 'rejected', 'waitlisted'].includes(application.status) && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Decision</h2>
          <div style={{
            padding: '1rem',
            borderRadius: '6px',
            background: application.status === 'admitted' ? '#d1e7dd'
              : application.status === 'rejected' ? '#f8d7da' : '#fff3cd',
            maxWidth: '500px',
          }}>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              {application.status === 'admitted' ? 'Admitted' : statusLabel(application.status)}
            </p>
            {application.decision_at && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666' }}>
                {new Date(application.decision_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {application.status === 'admitted' && !application.offer_response_at && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => handleOfferResponse('accepted')}
                disabled={!!responding}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: responding ? '#6c757d' : '#198754',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: responding ? 'not-allowed' : 'pointer',
                }}
              >
                {responding === 'accepted' ? 'Accepting...' : 'Accept Offer'}
              </button>
              <button
                onClick={() => handleOfferResponse('declined')}
                disabled={!!responding}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: responding ? '#6c757d' : '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: responding ? 'not-allowed' : 'pointer',
                }}
              >
                {responding === 'declined' ? 'Declining...' : 'Decline Offer'}
              </button>
            </div>
          )}

          {application.offer_response_at && (
            <p style={{ marginTop: '0.75rem', color: '#666', fontSize: '0.9rem' }}>
              You {application.status === 'accepted' ? 'accepted' : 'declined'} this offer on{' '}
              {new Date(application.offer_response_at).toLocaleDateString()}.
            </p>
          )}

          {respondError && (
            <div style={{ color: '#dc3545', marginTop: '0.75rem', padding: '0.5rem', background: '#f8d7da', borderRadius: '4px' }}>
              {respondError}
            </div>
          )}
        </section>
      )}

      {/* History Timeline */}
      <section style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <h2>Status History</h2>
        {history.length === 0 ? (
          <p style={{ color: '#666' }}>No status changes recorded.</p>
        ) : (
          <div style={{ maxWidth: '500px' }}>
            {history.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0', borderBottom: idx < history.length - 1 ? '1px solid #eee' : 'none' }}>
                <div style={{ minWidth: '2rem', textAlign: 'center' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: historyDotColor(item.to_status),
                    margin: '0.25rem auto',
                  }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {statusLabel(item.from_status || '')} &rarr; {statusLabel(item.to_status)}
                  </p>
                  <p style={{ margin: '0.15rem 0', fontSize: '0.8rem', color: '#666' }}>
                    {item.reason || statusLabel(item.to_status)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#999' }}>
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

function statusBg(status: string): string {
  switch (status) {
    case 'draft': return '#e9ecef'
    case 'submitted': return '#cfe2ff'
    case 'under_review': return '#fff3cd'
    case 'admitted': return '#d1e7dd'
    case 'rejected': return '#f8d7da'
    case 'waitlisted': return '#ffe0b2'
    case 'accepted': return '#1b5e20'
    case 'declined': return '#e9ecef'
    default: return '#e9ecef'
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'draft':
    case 'declined': return '#666'
    case 'submitted':
    case 'under_review': return '#664d03'
    case 'admitted': return '#0f5132'
    case 'rejected': return '#842029'
    case 'waitlisted': return '#e65100'
    case 'accepted': return '#fff'
    default: return '#666'
  }
}

function historyDotColor(status: string): string {
  switch (status) {
    case 'draft': return '#999'
    case 'submitted': return '#0d6efd'
    case 'under_review': return '#ffc107'
    case 'admitted':
    case 'accepted': return '#198754'
    case 'rejected':
    case 'declined': return '#dc3545'
    case 'waitlisted': return '#ff9800'
    default: return '#999'
  }
}

function docStatusLabel(item: DocumentChecklistItem, flaggedDoc: ApplicationDocument | null | undefined): string {
  if (!item.uploaded) return 'Not uploaded'
  if (item.status === 'verified') return 'Verified'
  if (item.status === 'flagged') {
    const reason = flaggedDoc?.flagged_reason
    return reason ? `Flagged: ${reason}` : 'Flagged — re-upload required'
  }
  return 'Pending review'
}

function docStatusColor(item: DocumentChecklistItem): string {
  if (!item.uploaded) return '#999'
  if (item.status === 'verified') return '#198754'
  if (item.status === 'flagged') return '#dc3545'
  return '#856404'
}
