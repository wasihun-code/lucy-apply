'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  FileText,
  Download,
  Upload,
} from 'lucide-react'
import type {
  Application,
  ApplicationDocument,
  DocumentChecklistItem,
  HistoryItem,
  UploadUrlResponse,
} from '@/lib/api'

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
  const [application, setApplication] = useState<Application | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [documents, setDocuments] = useState<ApplicationDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [pendingResponse, setPendingResponse] = useState<
    'accepted' | 'declined' | null
  >(null)
  const [responding, setResponding] = useState(false)
  const [respondError, setRespondError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const me = await getMe()
      if (!me) {
        router.push(
          '/login?redirect=' + encodeURIComponent(window.location.pathname),
        )
        return
      }

      try {
        const [app, hist, docs] = await Promise.all([
          authFetch<Application>(`applications/${params.id}/`),
          authFetch<HistoryItem[]>(`applications/${params.id}/history/`),
          authFetch<ApplicationDocument[]>(
            `applications/${params.id}/documents/`,
            { method: 'GET' },
          ),
        ])
        setApplication(app)
        setHistory(hist || [])
        setDocuments(docs || [])
      } catch (e) {
        setError(getErrorMessage(e))
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

  function handleOfferClick(response: 'accepted' | 'declined') {
    setPendingResponse(response)
    setRespondError(null)
    setShowOfferModal(true)
  }

  async function confirmOfferResponse() {
    if (!application?.id || !pendingResponse || responding) return
    setResponding(true)
    setRespondError(null)
    try {
      const updated = await authFetch<Application>(
        `applications/${application.id}/offer-response/`,
        {
          method: 'POST',
          body: JSON.stringify({ response: pendingResponse }),
        },
      )
      setApplication(updated)
      setHistory((prev) => [
        {
          from_status: 'admitted',
          to_status: pendingResponse,
          changed_by_type: 'applicant',
          reason: `Applicant ${pendingResponse} the offer`,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      setShowOfferModal(false)
      setPendingResponse(null)
    } catch (e) {
      setRespondError(getErrorMessage(e))
    } finally {
      setResponding(false)
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
          const msg =
            text.length > 200
              ? `Upload failed: HTTP ${res.status}`
              : text || `Upload failed: HTTP ${res.status}`
          throw new Error(msg)
        }

        await refreshApplication()
        const docs = await authFetch<ApplicationDocument[]>(
          `applications/${application.id}/documents/`,
          { method: 'GET' },
        )
        setDocuments(docs || [])
      } catch (e) {
        setError(getErrorMessage(e))
      } finally {
        setUploading(null)
      }
    }

    fileInput.click()
  }

  if (loading) {
    return <ApplicationDetailSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          &larr; Back to Dashboard
        </Button>
      </div>
    )
  }

  if (!application) {
    return (
      <div className="space-y-4">
        <Alert variant="info">Application not found.</Alert>
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          &larr; Back to Dashboard
        </Button>
      </div>
    )
  }

  const checklist: DocumentChecklistItem[] =
    application.document_checklist || []
  const fd = application.form_data || {}
  const hasFormData = Object.keys(fd).length > 0

  const borderColor = (() => {
    switch (application.status) {
      case 'admitted':
        return 'border-l-accent'
      case 'accepted':
        return 'border-l-success'
      case 'rejected':
        return 'border-l-danger'
      case 'draft':
        return ''
      default:
        return 'border-l-primary/20'
    }
  })()

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title={application.program_name}
        description={application.university_name}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: application.program_name, href: '#' },
        ]}
      />

      {/* Status banner */}
      {application.status !== 'draft' && (
        <Card
          padding="md"
          className={cn(
            'border-l-4',
            application.status === 'admitted' && 'border-l-accent',
            application.status === 'accepted' && 'border-l-success',
            application.status === 'rejected' && 'border-l-danger',
            application.status === 'waitlisted' && 'border-l-warning',
            application.status === 'under_review' && 'border-l-primary/20',
            application.status === 'submitted' && 'border-l-primary/20',
          )}
        >
          <div className="flex items-center gap-3">
            <StatusBadge status={application.status} />
            <div className="text-sm text-text-600">
              {statusDescription(application.status)}
            </div>
            {application.submitted_at && (
              <span className="text-xs text-text-400 ml-auto">
                Submitted {formatDate(application.submitted_at)}
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Offer response */}
      {application.status === 'admitted' && !application.offer_response_at && (
        <Card className="border-accent border-2" padding="md">
          <h3 className="text-xl font-display font-semibold text-accent">
            You&apos;ve been admitted!
          </h3>
          <p className="text-sm text-text-600 mt-2">
            Congratulations! You have been offered admission to{' '}
            {application.program_name} at {application.university_name}. Please
            review and respond to your offer.
          </p>
          <div className="flex gap-3 mt-4">
            <Button onClick={() => handleOfferClick('accepted')}>
              Accept Offer
            </Button>
            <Button
              variant="danger"
              onClick={() => handleOfferClick('declined')}
            >
              Decline Offer
            </Button>
          </div>
        </Card>
      )}

      {application.offer_response_at && (
        <Card padding="md">
          <p className="text-sm text-text-600">
            You {application.status === 'accepted' ? 'accepted' : 'declined'}{' '}
            this offer on {formatDate(application.offer_response_at)}.
          </p>
        </Card>
      )}

      {/* Application Information */}
      {hasFormData && (
        <Card padding="md">
          <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
            Application Information
          </h2>
          <dl className="space-y-6">{renderFormData(fd)}</dl>
        </Card>
      )}

      {/* Documents */}
      <Card padding="md">
        <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
          Documents
        </h2>
        {checklist.length === 0 ? (
          <p className="text-sm text-text-600">
            No documents required for this program.
          </p>
        ) : (
          <div className="space-y-3">
            {checklist.map((item) => {
              const flaggedDoc =
                item.status === 'flagged'
                  ? documents.find(
                      (d) =>
                        d.document_type === item.type &&
                        d.status === 'flagged',
                    )
                  : null
              const isUploading = uploading === item.type

              return (
                <div
                  key={item.type}
                  className="flex items-center justify-between p-4 bg-background rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText
                      size={16}
                      className="shrink-0 text-text-400"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-900 truncate">
                        {item.label}
                      </p>
                      {flaggedDoc?.flagged_reason && (
                        <p className="text-xs text-danger mt-0.5">
                          {flaggedDoc.flagged_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge
                      status={
                        flaggedDoc
                          ? 'flagged'
                          : item.status || (item.uploaded ? 'pending' : 'draft')
                      }
                    />
                    {flaggedDoc && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpload(item.type)}
                        disabled={isUploading}
                        icon={isUploading ? undefined : <Upload size={14} />}
                      >
                        {isUploading ? 'Uploading...' : 'Re-upload'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Status Timeline */}
      <Card padding="md">
        <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
          Application Timeline
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-text-600">No status changes recorded.</p>
        ) : (
          <div className="space-y-0">
            {[...history].reverse().map((item, idx, arr) => (
              <div
                key={idx}
                className="flex gap-3 pb-4 relative"
              >
                {/* Vertical line */}
                {idx < arr.length - 1 && (
                  <div className="absolute left-[5px] top-3 bottom-0 w-px bg-border" />
                )}
                {/* Dot */}
                <div
                  className={cn(
                    'w-3 h-3 rounded-full mt-1 shrink-0 z-10',
                    historyDotColor(item.to_status),
                  )}
                />
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-900">
                    {item.from_status
                      ? `${statusLabel(item.from_status)} → ${statusLabel(item.to_status)}`
                      : statusLabel(item.to_status)}
                  </p>
                  {item.reason && (
                    <p className="text-xs text-text-600 mt-0.5">
                      {item.reason}
                    </p>
                  )}
                  <p className="text-xs text-text-400 mt-0.5">
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Offer confirmation modal */}
      <Modal
        open={showOfferModal}
        onClose={() => !responding && setShowOfferModal(false)}
        title="Confirm Your Decision"
      >
        <p className="text-sm text-text-600 mb-4">
          Are you sure you want to{' '}
          <strong>{pendingResponse === 'accepted' ? 'accept' : 'decline'}</strong>{' '}
          the offer from {application.university_name}?
        </p>
        {respondError && (
          <Alert variant="danger" className="mb-4">
            {respondError}
          </Alert>
        )}
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowOfferModal(false)}
            disabled={responding}
          >
            Cancel
          </Button>
          <Button
            variant={pendingResponse === 'declined' ? 'danger' : 'primary'}
            loading={responding}
            onClick={confirmOfferResponse}
          >
            {pendingResponse === 'accepted'
              ? 'Yes, Accept Offer'
              : 'Yes, Decline Offer'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ')
}

function statusDescription(status: string): string {
  switch (status) {
    case 'draft':
      return 'This application is still in progress.'
    case 'submitted':
      return 'Your application has been submitted and is awaiting review.'
    case 'under_review':
      return 'Your application is currently being reviewed.'
    case 'admitted':
      return 'Congratulations! You have been admitted.'
    case 'rejected':
      return 'Your application was not successful.'
    case 'waitlisted':
      return 'You have been placed on the waitlist.'
    case 'accepted':
      return 'You have accepted the offer.'
    case 'declined':
      return 'You have declined the offer.'
    default:
      return ''
  }
}

function historyDotColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-neutral/30'
    case 'submitted':
      return 'bg-primary'
    case 'under_review':
      return 'bg-warning'
    case 'admitted':
    case 'accepted':
      return 'bg-success'
    case 'rejected':
    case 'declined':
      return 'bg-danger'
    case 'waitlisted':
      return 'bg-neutral'
    default:
      return 'bg-neutral/30'
  }
}

function renderFormData(
  data: Record<string, unknown>,
  depth = 0,
): React.ReactNode {
  return Object.entries(data).map(([key, value]) => {
    if (value === null || value === undefined) return null

    const label = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    if (Array.isArray(value)) {
      return (
        <div key={key} className="space-y-3">
          {depth === 0 && (
            <h3 className="text-base font-display font-semibold text-text-900">
              {label}
            </h3>
          )}
          {value.length === 0 && (
            <p className="text-sm text-text-400">None</p>
          )}
          {value.map((item, idx) =>
            typeof item === 'object' && item !== null ? (
              <div
                key={idx}
                className="bg-background rounded-lg p-4 space-y-2"
              >
                <p className="text-xs font-medium text-text-400 uppercase tracking-wider">
                  {label} {idx + 1}
                </p>
                <dl className="space-y-1.5">
                  {renderFormData(item as Record<string, unknown>, depth + 1)}
                </dl>
              </div>
            ) : (
              <div key={idx} className="flex gap-2 pl-0">
                <dt className="text-sm text-text-900">{String(item)}</dt>
              </div>
            ),
          )}
        </div>
      )
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} className="space-y-3">
          {depth === 0 && (
            <h3 className="text-base font-display font-semibold text-text-900">
              {label}
            </h3>
          )}
          <div
            className={depth === 0 ? 'bg-background rounded-lg p-4 space-y-2' : 'space-y-1.5'}
          >
            <dl className="space-y-1.5">
              {renderFormData(value as Record<string, unknown>, depth + 1)}
            </dl>
          </div>
        </div>
      )
    }

    return (
      <div key={key} className="flex gap-2">
        <dt className="text-sm font-medium text-text-600 w-36 shrink-0">
          {label}
        </dt>
        <dd className="text-sm text-text-900">{String(value)}</dd>
      </div>
    )
  })
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

function ApplicationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-20 w-full" />
      <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
        <Skeleton className="h-6 w-44" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
