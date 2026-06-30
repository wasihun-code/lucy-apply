'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import type { University } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { ErrorState } from '@/components/shared/ErrorState'
import { Building2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

export default function UniversityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [university, setUniversity] = useState<University | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [statusTarget, setStatusTarget] = useState(false)
  const [statusAction, setStatusAction] = useState<'activate' | 'deactivate'>('activate')
  const [savingStatus, setSavingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const me = await getMe()
    if (!me || me.role !== 'platformadmin') {
      router.push('/login')
      return
    }
    try {
      const data = await authFetch<University>(`universities/${id}/`)
      setUniversity(data)
      setError(null)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  function openStatusModal(action: 'activate' | 'deactivate') {
    setStatusAction(action)
    setStatusTarget(true)
    setStatusError(null)
  }

  async function handleStatusChange() {
    if (!university || savingStatus) return
    setSavingStatus(true)
    setStatusError(null)
    const newStatus = statusAction === 'activate' ? 'active' : 'inactive'
    try {
      await authFetch(`universities/${university.id}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setSuccess(
        `University ${statusAction === 'activate' ? 'activated' : 'deactivated'} successfully.`,
      )
      setStatusTarget(false)
      await loadData()
    } catch (e) {
      setStatusError(getErrorMessage(e))
    } finally {
      setSavingStatus(false)
    }
  }

  if (loading) return null

  if (error) {
    return (
      <ErrorState
        heading="Failed to load university"
        message={error}
        onRetry={loadData}
      />
    )
  }

  if (!university) return null

  return (
    <div>
      <PageHeader
        title={university.name}
        breadcrumb={[
          { label: 'Universities', href: '/admin/universities' },
          { label: university.name, href: `/admin/universities/${university.id}` },
        ]}
        action={
          <Link href={`/admin/universities/${university.id}/edit`}>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
          </Link>
        }
      />

      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-base font-display font-semibold text-text-900 mb-4">
            University Info
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-text-600">Name</p>
              <p className="text-sm text-text-900">{university.name}</p>
            </div>
            {university.description && (
              <div>
                <p className="text-sm font-medium text-text-600">Description</p>
                <p className="text-sm text-text-900">{university.description}</p>
              </div>
            )}
            {university.accreditation_info && (
              <div>
                <p className="text-sm font-medium text-text-600">Accreditation Info</p>
                <p className="text-sm text-text-900">{university.accreditation_info}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-text-600">Status</p>
              <StatusBadge status={university.status} />
            </div>
            <div>
              <p className="text-sm font-medium text-text-600">Created</p>
              <p className="text-sm text-text-900">{formatDate(university.created_at)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-display font-semibold text-text-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-4">
            {university.status === 'active' && (
              <Button
                variant="danger"
                className="w-full"
                onClick={() => openStatusModal('deactivate')}
              >
                Deactivate University
              </Button>
            )}
            {university.status === 'inactive' && (
              <Button
                variant="primary"
                className="w-full"
                onClick={() => openStatusModal('activate')}
              >
                Activate University
              </Button>
            )}
            <Link href={`/admin/universities`}>
              <Button variant="secondary" className="w-full">
                View All Universities
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <Modal
        open={statusTarget}
        onClose={() => setStatusTarget(false)}
        title={statusAction === 'activate' ? 'Activate University' : 'Deactivate University'}
      >
        <p className="text-sm text-text-600 mb-4">
          {statusAction === 'activate'
            ? `Are you sure you want to activate "${university.name}"? It will become visible to applicants.`
            : `Are you sure you want to deactivate "${university.name}"? It will be hidden from applicants.`}
        </p>
        {statusError && (
          <Alert variant="danger" className="mb-4">
            {statusError}
          </Alert>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setStatusTarget(false)}>
            Cancel
          </Button>
          <Button
            variant={statusAction === 'deactivate' ? 'danger' : 'primary'}
            loading={savingStatus}
            onClick={handleStatusChange}
          >
            {statusAction === 'activate' ? 'Activate' : 'Deactivate'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
