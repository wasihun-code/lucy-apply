'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1/'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return (
    document.cookie
      .split('; ')
      .find((c) => c.startsWith('access_token='))
      ?.split('=')[1] ?? null
  )
}

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const base = API_URL.replace(/\/$/, '')
  const url = `${base}/${path.replace(/^\//, '')}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

interface ApplicationDetail {
  id: string
  applicant: string
  applicant_name?: string
  program: string
  program_name: string
  university: string
  university_name: string
  admission_cycle: string
  status: string
  form_data: Record<string, unknown>
  document_checklist: { type: string; label: string; status: string | null; uploaded: boolean }[]
  submitted_at: string | null
  decision_at: string | null
  decision_by: string | null
  offer_response_at: string | null
  created_at: string
  updated_at: string
}

interface DocumentItem {
  id: string
  document_type: string
  status: string
  flagged_reason: string | null
  version: number
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  admitted: 'Admitted',
  rejected: 'Rejected',
  waitlisted: 'Waitlisted',
  accepted: 'Accepted',
  declined: 'Declined',
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    draft: '#6c757d',
    submitted: '#0d6efd',
    under_review: '#ffc107',
    admitted: '#198754',
    rejected: '#dc3545',
    waitlisted: '#fd7e14',
    accepted: '#198754',
    declined: '#6c757d',
  }
  return (
    <span style={{
      fontSize: '0.8rem',
      padding: '0.25rem 0.6rem',
      borderRadius: '4px',
      background: colors[status] || '#e9ecef',
      color: ['under_review'].includes(status) ? '#000' : '#fff',
      fontWeight: 600,
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [app, setApp] = useState<ApplicationDetail | null>(null)
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flagModal, setFlagModal] = useState<{ docId: string; docType: string } | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [flagging, setFlagging] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [reverseReason, setReverseReason] = useState('')
  const [showReverseInput, setShowReverseInput] = useState(false)
  const [deciding, setDeciding] = useState(false)

  const fetchData = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError('')
    Promise.all([
      authFetch<ApplicationDetail>(`applications/${id}/`),
      authFetch<DocumentItem[]>(`applications/${id}/documents/`),
    ]).then(([appData, docsData]) => {
      setApp(appData)
      setDocs(docsData)
    }).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load')
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleVerify(docId: string) {
    try {
      await authFetch(`documents/${docId}/verify/`, { method: 'PATCH' })
      setActionMsg('Document verified')
      fetchData()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Verify failed')
    }
  }

  async function handleFlag() {
    if (!flagModal || !flagReason.trim()) return
    setFlagging(true)
    try {
      await authFetch(`documents/${flagModal.docId}/flag/`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: flagReason.trim() }),
      })
      setActionMsg('Document flagged')
      setFlagModal(null)
      setFlagReason('')
      fetchData()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Flag failed')
    } finally {
      setFlagging(false)
    }
  }

  async function handleDecision(status: string) {
    setDeciding(true)
    try {
      await authFetch(`applications/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setActionMsg(`Decision issued: ${status}`)
      fetchData()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Decision failed')
    } finally {
      setDeciding(false)
    }
  }

  async function handleReverse() {
    if (!reverseReason.trim()) return
    setDeciding(true)
    try {
      await authFetch(`applications/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'under_review', reason: reverseReason.trim() }),
      })
      setActionMsg('Decision reversed')
      setShowReverseInput(false)
      setReverseReason('')
      fetchData()
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Reverse failed')
    } finally {
      setDeciding(false)
    }
  }

  if (loading) return <p>Loading application...</p>
  if (error) return <p style={{ color: '#dc3545' }}>{error}</p>
  if (!app) return <p>Application not found.</p>

  const allDocsVerified = app.document_checklist.every(
    (d) => d.status === 'verified' || !d.uploaded
  )
  const isDecisionState = ['admitted', 'rejected', 'waitlisted'].includes(app.status)
  const canReverse = isDecisionState && !app.offer_response_at

  const latestDocsByType: Record<string, DocumentItem> = {}
  for (const doc of docs) {
    if (!latestDocsByType[doc.document_type] || doc.version > latestDocsByType[doc.document_type].version) {
      latestDocsByType[doc.document_type] = doc
    }
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      {actionMsg && (
        <div style={{
          padding: '0.5rem 1rem',
          background: actionMsg.includes('fail') || actionMsg.includes('error') ? '#f8d7da' : '#d1e7dd',
          borderRadius: '4px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
        }}>
          {actionMsg}
          <button
            onClick={() => setActionMsg('')}
            style={{ marginLeft: '1rem', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            x
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Application Review</h2>
        {statusBadge(app.status)}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p><strong>Applicant:</strong> {app.applicant_name || app.applicant}</p>
        <p><strong>Program:</strong> {app.program_name}</p>
        <p><strong>University:</strong> {app.university_name}</p>
        <p><strong>Submitted:</strong> {app.submitted_at ? new Date(app.submitted_at).toLocaleString() : '—'}</p>
        {app.decision_at && <p><strong>Decision date:</strong> {new Date(app.decision_at).toLocaleString()}</p>}
        {app.offer_response_at && <p><strong>Applicant responded:</strong> {new Date(app.offer_response_at).toLocaleString()}</p>}
      </div>

      {Object.keys(app.form_data).length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Application Data</h3>
          <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem' }}>
            {Object.entries(app.form_data).map(([key, value]) => (
              <div key={key} style={{ marginBottom: '0.25rem' }}>
                <strong>{key}:</strong> {String(value)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Documents</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {app.document_checklist.length === 0 ? (
            <p style={{ color: '#666', fontSize: '0.9rem' }}>No required documents for this program.</p>
          ) : app.document_checklist.map((item) => {
            const doc = latestDocsByType[item.type]
            return (
              <div
                key={item.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                }}
              >
                <div>
                  <strong>{item.label}</strong>
                  {doc && doc.flagged_reason && (
                    <div style={{ fontSize: '0.8rem', color: '#dc3545', marginTop: '0.2rem' }}>
                      Reason: {doc.flagged_reason}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {item.uploaded ? (
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: item.status === 'verified' ? '#d1e7dd' : item.status === 'flagged' ? '#f8d7da' : '#fff3cd',
                      color: item.status === 'verified' ? '#0f5132' : item.status === 'flagged' ? '#842029' : '#664d03',
                    }}>
                      {item.status}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>Not uploaded</span>
                  )}
                  {item.uploaded && doc && item.status !== 'verified' && (
                    <button
                      onClick={() => handleVerify(doc.id)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: '#198754',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      Verify
                    </button>
                  )}
                  {item.uploaded && doc && item.status !== 'flagged' && item.status !== 'verified' && (
                    <button
                      onClick={() => setFlagModal({ docId: doc.id, docType: item.label })}
                      style={{
                        padding: '0.3rem 0.6rem',
                        background: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      Flag
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Decision</h3>

        {isDecisionState ? (
          <div>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Current decision: <strong>{STATUS_LABELS[app.status]}</strong>
              {app.offer_response_at ? ' — Applicant has responded.' : ''}
            </p>
            {canReverse && (
              <div>
                {!showReverseInput ? (
                  <button
                    onClick={() => setShowReverseInput(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#fd7e14',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Reverse Decision
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <textarea
                      value={reverseReason}
                      onChange={(e) => setReverseReason(e.target.value)}
                      placeholder="Reason for reversal..."
                      rows={2}
                      style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                    />
                    <button
                      onClick={handleReverse}
                      disabled={deciding || !reverseReason.trim()}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#fd7e14',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: deciding || !reverseReason.trim() ? 'not-allowed' : 'pointer',
                        opacity: deciding || !reverseReason.trim() ? 0.6 : 1,
                        fontSize: '0.9rem',
                      }}
                    >
                      {deciding ? 'Reversing...' : 'Confirm Reverse'}
                    </button>
                    <button
                      onClick={() => { setShowReverseInput(false); setReverseReason('') }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#6c757d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            {app.status === 'submitted' && (
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Move to under review to enable decision buttons.
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['admitted', 'rejected', 'waitlisted'].map((decision) => {
                const colors: Record<string, string> = {
                  admitted: '#198754',
                  rejected: '#dc3545',
                  waitlisted: '#fd7e14',
                }
                return (
                  <button
                    key={decision}
                    onClick={() => handleDecision(decision)}
                    disabled={deciding || (app.status === 'under_review' && !allDocsVerified)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: colors[decision],
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: deciding || (app.status === 'under_review' && !allDocsVerified) ? 'not-allowed' : 'pointer',
                      opacity: deciding || (app.status === 'under_review' && !allDocsVerified) ? 0.5 : 1,
                      fontSize: '0.9rem',
                    }}
                    title={
                      app.status === 'under_review' && !allDocsVerified
                        ? 'All documents must be verified before issuing a decision'
                        : ''
                    }
                  >
                    {deciding ? 'Processing...' : decision.charAt(0).toUpperCase() + decision.slice(1)}
                  </button>
                )
              })}
            </div>
            {app.status === 'under_review' && !allDocsVerified && (
              <p style={{ color: '#dc3545', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                All documents must be verified before issuing a decision.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push('/portal/applications')}
        style={{
          padding: '0.4rem 0.8rem',
          background: '#6c757d',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.85rem',
        }}
      >
        Back to Applications
      </button>

      {flagModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Flag Document</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>
              Provide a reason for flagging <strong>{flagModal.docType}</strong>:
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              rows={3}
              placeholder="Required reason..."
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setFlagModal(null); setFlagReason('') }}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleFlag}
                disabled={flagging || !flagReason.trim()}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: flagging || !flagReason.trim() ? 'not-allowed' : 'pointer',
                  opacity: flagging || !flagReason.trim() ? 0.6 : 1,
                }}
              >
                {flagging ? 'Flagging...' : 'Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
