'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { getErrorMessage } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { Table, type Column } from '@/components/ui/Table'
import { Calendar } from 'lucide-react'

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

interface Cycle {
  id: string
  name: string
  open_date: string
  close_date: string
  status: string
}

export default function CyclesPage() {
  const router = useRouter()
  const params = useParams()
  const programId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [me, setMe] = useState<{ role: string; permission_level?: string } | null>(null)
  const [programName, setProgramName] = useState('')
  const [cycles, setCycles] = useState<Cycle[]>([])

  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newOpenDate, setNewOpenDate] = useState('')
  const [newCloseDate, setNewCloseDate] = useState('')
  const [newDateError, setNewDateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [confirmAction, setConfirmAction] = useState<{
    cycleId: string
    action: 'close' | 'archive'
  } | null>(null)

  const loadData = useCallback(async () => {
    if (!programId) return
    try {
      const m = await getMe()
      if (!m || m.role !== 'universitystaff') {
        router.push('/portal/programs')
        return
      }
      setMe(m as { role: string; permission_level?: string })

      const [progRes, cycRes] = await Promise.all([
        authFetch<{ name: string }>(`programs/${programId}/`),
        authFetch<Cycle[] | { results: Cycle[] }>(`programs/${programId}/cycles/`),
      ])
      setProgramName(progRes.name)
      const raw = cycRes as Cycle[] | { results: Cycle[] }
      setCycles(Array.isArray(raw) ? raw : raw.results || [])
    } catch {
      router.push('/portal/programs')
    } finally {
      setLoading(false)
    }
  }, [programId, router])

  useEffect(() => { loadData() }, [loadData])

  const isAdmin = me?.permission_level === 'admin'

  async function handleCreateCycle() {
    if (!programId || creating) return

    if (!newName.trim() || !newOpenDate || !newCloseDate) return

    if (new Date(newCloseDate) <= new Date(newOpenDate)) {
      setNewDateError('Close date must be after open date.')
      return
    }
    setNewDateError(null)
    setCreating(true)
    setError(null)

    try {
      await authFetch(`programs/${programId}/cycles/`, {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          open_date: newOpenDate,
          close_date: newCloseDate,
        }),
      })
      setNewModalOpen(false)
      setNewName('')
      setNewOpenDate('')
      setNewCloseDate('')
      setSuccess('Cycle created successfully.')
      await loadData()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setCreating(false)
    }
  }

  async function handleCloseCycle(cycleId: string) {
    setConfirmAction(null)
    setError(null)
    setSuccess(null)
    try {
      await authFetch(`admission-cycles/${cycleId}/close/`, { method: 'PATCH' })
      setSuccess('Cycle closed.')
      await loadData()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleArchiveCycle(cycleId: string) {
    setConfirmAction(null)
    setError(null)
    setSuccess(null)
    try {
      await authFetch(`admission-cycles/${cycleId}/archive/`, { method: 'PATCH' })
      setSuccess('Cycle archived.')
      await loadData()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const columns: Column<Cycle>[] = [
    {
      key: 'name',
      header: 'Cycle Name',
      render: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: 'open_date',
      header: 'Opens',
      render: (c) => (
        <span className="text-text-600">{formatDate(c.open_date)}</span>
      ),
    },
    {
      key: 'close_date',
      header: 'Closes',
      render: (c) => (
        <span className="text-text-600">{formatDate(c.close_date)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => {
        if (!isAdmin) return null
        if (c.status === 'open') {
          return (
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmAction({ cycleId: c.id, action: 'close' })
              }}
            >
              Close Early
            </Button>
          )
        }
        if (c.status === 'closed') {
          return (
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmAction({ cycleId: c.id, action: 'archive' })
              }}
            >
              Archive
            </Button>
          )
        }
        return null
      },
    },
  ]

  if (loading) return null

  return (
    <div>
      <PageHeader
        title="Admission Cycles"
        breadcrumb={[
          { label: 'Programs', href: '/portal/programs' },
          { label: programName, href: `/portal/programs/${programId}/edit` },
          { label: 'Cycles', href: '#' },
        ]}
        action={
          isAdmin && (
            <Button variant="primary" size="sm" onClick={() => setNewModalOpen(true)}>
              + New Cycle
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="danger" className="mb-6">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      {cycles.length === 0 ? (
        <EmptyState
          icon={<Calendar size={32} className="text-text-400" />}
          heading="No admission cycles"
          description="Create a cycle to start accepting applications for this program."
          action={
            isAdmin
              ? { label: '+ New Cycle', onClick: () => setNewModalOpen(true) }
              : undefined
          }
        />
      ) : (
        <Table<Cycle>
          columns={columns}
          data={cycles}
        />
      )}

      <Modal
        open={newModalOpen}
        onClose={() => {
          setNewModalOpen(false)
          setNewDateError(null)
        }}
        title="New Admission Cycle"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="cycleName"
              className="text-sm font-body font-medium text-text-600"
            >
              Cycle Name <span className="text-danger">*</span>
            </label>
            <Input
              id="cycleName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Fall 2027"
              className="mt-1.5"
            />
          </div>
          <div>
            <label
              htmlFor="openDate"
              className="text-sm font-body font-medium text-text-600"
            >
              Open Date <span className="text-danger">*</span>
            </label>
            <Input
              id="openDate"
              type="datetime-local"
              value={newOpenDate}
              onChange={(e) => setNewOpenDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <label
              htmlFor="closeDate"
              className="text-sm font-body font-medium text-text-600"
            >
              Close Date <span className="text-danger">*</span>
            </label>
            <Input
              id="closeDate"
              type="datetime-local"
              value={newCloseDate}
              onChange={(e) => setNewCloseDate(e.target.value)}
              className="mt-1.5"
            />
            {newDateError && (
              <p className="text-xs text-danger mt-1">{newDateError}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setNewModalOpen(false)
                setNewDateError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creating}
              onClick={handleCreateCycle}
            >
              Create Cycle
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmAction?.action === 'close'}
        onClose={() => setConfirmAction(null)}
        title="Close Cycle Early"
      >
        <p className="text-sm text-text-600 mb-6">
          This cycle will be closed immediately. New applications will be blocked.
          Are you sure?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmAction) handleCloseCycle(confirmAction.cycleId)
            }}
          >
            Close Early
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmAction?.action === 'archive'}
        onClose={() => setConfirmAction(null)}
        title="Archive Cycle"
      >
        <p className="text-sm text-text-600 mb-6">
          This cycle will be archived and its data preserved. This action cannot be
          undone. Are you sure?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirmAction) handleArchiveCycle(confirmAction.cycleId)
            }}
          >
            Archive
          </Button>
        </div>
      </Modal>
    </div>
  )
}
