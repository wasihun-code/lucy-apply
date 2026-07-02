'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import type { StaffMember } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Table, type Column } from '@/components/ui/Table'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users, Trash2 } from 'lucide-react'

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

export default function TeamPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [universityId, setUniversityId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLevel, setInviteLevel] = useState('officer')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const me = await getMe()
    if (!me || !me.university) {
      router.push('/login')
      return
    }
    setUniversityId(me.university)
    setIsAdmin(me.permission_level === 'admin')
    setCurrentUserId(me.id ?? null)
    try {
      const data = await authFetch<StaffMember[]>(`universities/${me.university}/staff/`)
      setStaff(data)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!universityId || inviting) return
    setInviting(true)
    setInviteError(null)
    try {
      await authFetch(`universities/${universityId}/staff/`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          full_name: inviteName,
          permission_level: inviteLevel,
        }),
      })
      setInviteModalOpen(false)
      setInviteName('')
      setInviteEmail('')
      setInviteLevel('officer')
      setSuccess('Staff member invited successfully.')
      await loadData()
    } catch (e) {
      setInviteError(getErrorMessage(e))
    } finally {
      setInviting(false)
    }
  }

  async function handleRemove() {
    if (!removeTarget || !universityId || removing) return
    setRemoving(true)
    setRemoveError(null)
    try {
      await authFetch(`universities/${universityId}/staff/${removeTarget.id}/`, {
        method: 'DELETE',
      })
      setRemoveTarget(null)
      setSuccess('Staff member removed.')
      await loadData()
    } catch (e) {
      setRemoveError(getErrorMessage(e))
    } finally {
      setRemoving(false)
    }
  }

  const columns: Column<StaffMember>[] = [
    {
      key: 'full_name',
      header: 'Name',
      render: (s) => <span className="font-medium text-text-900">{s.full_name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (s) => <span className="text-text-400">{s.email}</span>,
    },
    {
      key: 'permission_level',
      header: 'Role',
      render: (s) => <StatusBadge status={s.permission_level as 'admin' | 'officer'} />,
    },
    {
      key: 'account_status',
      header: 'Status',
      render: (s) => <StatusBadge status={s.account_status as 'active' | 'inactive'} />,
    },
    ...(isAdmin
      ? [
          {
            key: 'actions' as const,
            header: 'Actions',
            render: (s: StaffMember) =>
              s.account_status === 'active' && s.id !== currentUserId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoveTarget(s)}
                  aria-label={`Remove ${s.full_name}`}
                >
                  <Trash2 size={16} className="text-danger" />
                </Button>
              ) : null,
          },
        ]
      : []),
  ]

  if (loading) return null

  return (
    <div>
      <PageHeader
        title="Team Members"
        action={
          isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setInviteModalOpen(true)
                setInviteError(null)
              }}
            >
              + Invite Staff
            </Button>
          )
        }
      />

      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-6">
          {error}
        </Alert>
      )}

      {staff.length === 0 ? (
        <EmptyState
          icon={<Users size={32} className="text-text-400" />}
          heading="No team members"
          description="Invite staff members to manage applications and programs."
          action={
            isAdmin
              ? { label: '+ Invite Staff', onClick: () => setInviteModalOpen(true) }
              : undefined
          }
        />
      ) : (
        <Table<StaffMember> columns={columns} data={staff} />
      )}

      <Modal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Staff Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <FormField label="Full Name" htmlFor="inviteName" required>
            <Input
              id="inviteName"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              required
              placeholder="e.g. Jane Smith"
            />
          </FormField>
          <FormField label="Email Address" htmlFor="inviteEmail" required>
            <Input
              id="inviteEmail"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              placeholder="jane@university.edu"
            />
          </FormField>
          <FormField label="Role" htmlFor="inviteRole" required>
            <Select
              id="inviteRole"
              value={inviteLevel}
              onChange={(e) => setInviteLevel(e.target.value)}
            >
              <option value="officer">Officer</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          {inviteError && (
            <Alert variant="danger">{inviteError}</Alert>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={inviting}>
              Invite Staff
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remove Staff Member"
      >
        <p className="text-sm text-text-600 mb-4">
          Are you sure you want to remove{' '}
          <strong>{removeTarget?.full_name}</strong> ({removeTarget?.email})?
          This will deactivate their account.
        </p>
        {removeError && (
          <Alert variant="danger" className="mb-4">
            {removeError}
          </Alert>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={removing} onClick={handleRemove}>
            Remove Staff
          </Button>
        </div>
      </Modal>
    </div>
  )
}
