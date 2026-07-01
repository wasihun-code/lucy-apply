'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { formatDate, cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusTimeline } from '@/components/shared/StatusTimeline'
import {
  statusLabel,
  historyDotColor,
  getDocDisplayStatus,
  ApplicationDetailSkeleton,
} from '@/lib/application-helpers'
import { File } from 'lucide-react'

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
  document_checklist: {
    type: string
    label: string
    status: string | null
    uploaded: boolean
  }[]
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
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

interface HistoryItem {
  from_status: string | null
  to_status: string
  changed_by_type: string
  reason: string
  created_at: string
}

async function authFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
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

export default function ApplicationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [app, setApp] = useState<ApplicationDetail | null>(null)
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null)

  const [flagFormDocId, setFlagFormDocId] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')
  const [flagging, setFlagging] = useState(false)
  const [flagError, setFlagError] = useState('')

  const [decisionTarget, setDecisionTarget] = useState<string | null>(null)
  const [deciding, setDeciding] = useState(false)
  const [decisionError, setDecisionError] = useState('')

  const [reverseModalOpen, setReverseModalOpen] = useState(false)
  const [reverseReason, setReverseReason] = useState('')
  const [reversing, setReversing] = useState(false)
  const [reverseError, setReverseError] = useState('')

  const fetchData = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError('')
    Promise.all([
      authFetch<ApplicationDetail>(`applications/${id}/`),
      authFetch<DocumentItem[]>(`applications/${id}/documents/`),
      authFetch<HistoryItem[]>(`applications/${id}/history/`),
    ])
      .then(([appData, docsData, historyData]) => {
        setApp(appData)
        setDocs(docsData)
        setHistory(historyData)
      })
      .catch((e) => {
        setError(getErrorMessage(e))
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    getMe()
      .then((m) => {
        if (
          !m ||
          (m.role !== 'universitystaff' && m.role !== 'platformadmin')
        ) {
          router.push('/login')
        }
      })
      .catch(() => router.push('/login'))
  }, [router])

  const latestDocsByType = useMemo(() => {
    const map: Record<string, DocumentItem> = {}
    for (const doc of docs) {
      const existing = map[doc.document_type]
      if (!existing || doc.version > existing.version) {
        map[doc.document_type] = doc
      }
    }
    return map
  }, [docs])

  async function handleVerify(docId: string) {
    setVerifyingDocId(docId)
    try {
      await authFetch(`documents/${docId}/verify/`, { method: 'PATCH' })
      await fetchData()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setVerifyingDocId(null)
    }
  }

  async function handleFlag() {
    if (!flagFormDocId || !flagReason.trim()) return
    setFlagging(true)
    setFlagError('')
    try {
      await authFetch(`documents/${flagFormDocId}/flag/`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: flagReason.trim() }),
      })
      setFlagFormDocId(null)
      setFlagReason('')
      await fetchData()
    } catch (e) {
      setFlagError(getErrorMessage(e))
    } finally {
      setFlagging(false)
    }
  }

  async function handleOpenForReview() {
    try {
      await authFetch(`applications/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'under_review' }),
      })
      await fetchData()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleDecision() {
    if (!decisionTarget) return
    setDeciding(true)
    setDecisionError('')
    try {
      await authFetch(`applications/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: decisionTarget }),
      })
      setDecisionTarget(null)
      await fetchData()
    } catch (e) {
      setDecisionError(getErrorMessage(e))
    } finally {
      setDeciding(false)
    }
  }

  async function handleReverse() {
    if (!reverseReason.trim()) return
    setReversing(true)
    setReverseError('')
    try {
      await authFetch(`applications/${id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'under_review',
          reason: reverseReason.trim(),
        }),
      })
      setReverseModalOpen(false)
      setReverseReason('')
      await fetchData()
    } catch (e) {
      setReverseError(getErrorMessage(e))
    } finally {
      setReversing(false)
    }
  }

  if (loading) return <ApplicationDetailSkeleton />
  if (error) {
    return (
      <div>
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" className="mt-4" onClick={fetchData}>
          Retry
        </Button>
      </div>
    )
  }
  if (!app) {
    return (
      <div>
        <Alert variant="danger">Application not found.</Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push('/portal/applications')}
        >
          Back to Applications
        </Button>
      </div>
    )
  }

  const personal = (app.form_data?.personal as Record<string, string>) || {}
  const contact = (app.form_data?.contact as Record<string, string>) || {}
  const motivation =
    (app.form_data?.motivation as Record<string, string>) || {}

  const fullName =
    [personal.given_name, personal.middle_name, personal.family_name]
      .filter(Boolean)
      .join(' ') || app.applicant_name || '—'

  const phone =
    [contact.mobile_country_code, contact.mobile_number]
      .filter(Boolean)
      .join(' ') || '—'
  const nationality = personal.nationality || personal.citizenship || '—'
  const dateOfBirth = personal.date_of_birth || '—'
  const personalStatement = motivation.personal_statement || '—'

  const allDocsVerified = app.document_checklist.every(
    (d) => d.status === 'verified' || !d.uploaded,
  )
  const unverifiedCount = app.document_checklist.filter(
    (d) => d.uploaded && d.status !== 'verified',
  ).length

  const isDecisionState = ['admitted', 'rejected', 'waitlisted'].includes(
    app.status,
  )
  const canReverse = isDecisionState && !app.offer_response_at
  const isApplicantResponded = ['accepted', 'declined'].includes(app.status)

  function renderDecisionVariant(
    decision: string,
  ): 'primary' | 'secondary' | 'danger' {
    if (decision === 'admitted') return 'primary'
    if (decision === 'rejected') return 'danger'
    return 'secondary'
  }

  return (
    <div>
      <PageHeader
        title={fullName}
        breadcrumb={[
          { label: 'Applications', href: '/portal/applications' },
          { label: fullName, href: '#' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Applicant Information */}
          <Card>
            <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
              Applicant Information
            </h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-text-600">
                  Full Name
                </dt>
                <dd className="text-sm text-text-900 mt-1">{fullName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-600">Email</dt>
                <dd className="text-sm text-text-400 mt-1">
                  {app.applicant}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-600">
                  Phone Number
                </dt>
                <dd className="text-sm text-text-900 mt-1">{phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-600">
                  Nationality
                </dt>
                <dd className="text-sm text-text-900 mt-1">{nationality}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-600">
                  Date of Birth
                </dt>
                <dd className="text-sm text-text-900 mt-1">{dateOfBirth}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-600">
                  Personal Statement
                </dt>
                <dd className="text-sm text-text-900 mt-1 whitespace-pre-wrap">
                  {personalStatement}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Required Documents */}
          <Card>
            <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
              Required Documents
            </h2>
            {app.document_checklist.length === 0 ? (
              <p className="text-sm text-text-600">
                No required documents for this program.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {app.document_checklist.map((item) => {
                  const doc = latestDocsByType[item.type]
                  const { badgeStatus, label: badgeLabel } =
                    getDocDisplayStatus(item)
                  const canAct = item.uploaded && !item.status

                  return (
                    <div key={item.type}>
                      <div className="flex items-center justify-between py-3 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <File
                            size={20}
                            className="text-text-400 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-900 truncate">
                              {item.label}
                            </p>
                            {doc && (
                              <p className="text-xs text-text-400 mt-0.5">
                                Last updated:{' '}
                                {formatDate(doc.created_at)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge
                            status={badgeStatus}
                            label={badgeLabel}
                          />
                          {canAct && doc && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                loading={verifyingDocId === doc.id}
                                onClick={() => handleVerify(doc.id)}
                              >
                                Verify
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setFlagFormDocId(doc.id)
                                  setFlagReason('')
                                  setFlagError('')
                                }}
                              >
                                Flag
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Verified info */}
                      {item.status === 'verified' && doc && (
                        <div className="pb-3 -mt-1">
                          <p className="text-xs text-text-400">
                            Verified
                            {doc.reviewed_at
                              ? ` on ${formatDate(doc.reviewed_at)}`
                              : ''}
                          </p>
                        </div>
                      )}

                      {/* Flagged reason */}
                      {item.status === 'flagged' && doc?.flagged_reason && (
                        <div className="pb-3 -mt-1">
                          <p className="text-sm text-danger italic">
                            {doc.flagged_reason}
                          </p>
                        </div>
                      )}

                      {/* Inline flag form */}
                      {flagFormDocId === doc?.id && (
                        <div className="pb-3 space-y-2">
                          <Textarea
                            value={flagReason}
                            onChange={(e) => setFlagReason(e.target.value)}
                            placeholder="Describe the issue with this document..."
                            rows={3}
                            aria-label="Reason for flagging this document"
                          />
                          {flagError && (
                            <Alert variant="danger">{flagError}</Alert>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={handleFlag}
                              disabled={!flagReason.trim()}
                              loading={flagging}
                            >
                              Confirm Flag
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setFlagFormDocId(null)
                                setFlagReason('')
                                setFlagError('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Status Timeline */}
          <Card>
            <StatusTimeline entries={history} />
          </Card>
        </div>

        {/* ── Right column — Decision Panel ── */}
        <div className="lg:sticky lg:top-6 self-start space-y-6">
          <Card>
            <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
              Decision
            </h2>

            {/* Applicant responded */}
            {isApplicantResponded && (
              <Alert variant="info">
                Applicant has {statusLabel(app.status)} the offer
                {app.offer_response_at
                  ? ` on ${formatDate(app.offer_response_at)}`
                  : ''}
                . No further action required.
              </Alert>
            )}

            {/* Decision issued, no response */}
            {canReverse && (
              <div>
                <Alert
                  variant={
                    app.status === 'admitted' ? 'success' : 'danger'
                  }
                >
                  Decision issued: {statusLabel(app.status)}
                  {app.decision_at
                    ? ` on ${formatDate(app.decision_at)}`
                    : ''}
                </Alert>
                <Button
                  variant="ghost"
                  className="w-full mt-3"
                  onClick={() => {
                    setReverseModalOpen(true)
                    setReverseReason('')
                    setReverseError('')
                  }}
                >
                  Reverse Decision
                </Button>
              </div>
            )}

            {/* Under review — doc check + decision buttons */}
            {app.status === 'under_review' && (
              <div>
                {unverifiedCount > 0 && (
                  <Alert variant="warning" className="mb-3">
                    {unverifiedCount} document(s) need verification before a
                    decision can be issued.
                  </Alert>
                )}
                {allDocsVerified && (
                  <div className="space-y-2">
                    {['admitted', 'waitlisted', 'rejected'].map(
                      (decision) => (
                        <Button
                          key={decision}
                          variant={renderDecisionVariant(decision)}
                          className="w-full"
                          onClick={() => {
                            setDecisionTarget(decision)
                            setDecisionError('')
                          }}
                        >
                          {decision.charAt(0).toUpperCase() +
                            decision.slice(1)}
                        </Button>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Draft / submitted — open for review */}
            {!isDecisionState &&
              !isApplicantResponded &&
              app.status !== 'under_review' && (
                <div>
                  <Alert variant="info" className="mb-3">
                    This application has not been opened for review yet.
                  </Alert>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleOpenForReview}
                  >
                    Open for Review
                  </Button>
                </div>
              )}

            {/* Current status */}
            {!isApplicantResponded && (
              <div className="flex items-center justify-center mt-4">
                <StatusBadge status={app.status} />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── Decision confirmation modal ── */}
      <Modal
        open={decisionTarget !== null}
        onClose={() => !deciding && setDecisionTarget(null)}
        title="Confirm Decision"
      >
        <p className="text-sm text-text-600">
          Are you sure you want to mark this application as{' '}
          <strong>
            {decisionTarget
              ? statusLabel(decisionTarget)
              : ''}
          </strong>
          ?
        </p>
        <p className="text-xs text-text-400 mt-2">
          This action can be reversed if the applicant has not yet responded.
        </p>
        {decisionError && (
          <Alert variant="danger" className="mt-3">
            {decisionError}
          </Alert>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setDecisionTarget(null)}
            disabled={deciding}
          >
            Cancel
          </Button>
          <Button
            variant={
              decisionTarget
                ? renderDecisionVariant(decisionTarget)
                : 'primary'
            }
            loading={deciding}
            onClick={handleDecision}
          >
            Confirm
          </Button>
        </div>
      </Modal>

      {/* ── Reverse decision modal ── */}
      <Modal
        open={reverseModalOpen}
        onClose={() => !reversing && setReverseModalOpen(false)}
        title="Reverse Decision"
      >
        <p className="text-sm text-text-600">
          Provide a reason for reversing this decision:
        </p>
        <Textarea
          value={reverseReason}
          onChange={(e) => setReverseReason(e.target.value)}
          placeholder="Reason for reversal..."
          rows={3}
          className="mt-3"
          aria-label="Reason for reversing this decision"
        />
        {reverseError && (
          <Alert variant="danger" className="mt-3">
            {reverseError}
          </Alert>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setReverseModalOpen(false)}
            disabled={reversing}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={reversing}
            disabled={!reverseReason.trim()}
            onClick={handleReverse}
          >
            Confirm Reversal
          </Button>
        </div>
      </Modal>
    </div>
  )
}
