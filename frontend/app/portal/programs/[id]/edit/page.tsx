'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Plus, X } from 'lucide-react'

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

interface ProgramDetail {
  id: string
  name: string
  degree_level: string
  description: string
  requirements: string
  fee_amount: string
  fee_currency: string
  status: string
  required_documents: { type: string; label: string }[]
}

interface DocRow {
  type: string
  label: string
}

export default function EditProgramPage() {
  const router = useRouter()
  const params = useParams()
  const programId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [name, setName] = useState('')
  const [degreeLevel, setDegreeLevel] = useState('undergraduate')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [status, setStatus] = useState('draft')
  const [docs, setDocs] = useState<DocRow[]>([])

  const [confirmAction, setConfirmAction] = useState<'publish' | 'archive' | null>(null)

  useEffect(() => {
    if (!programId) return
    getMe().then(async (m) => {
      if (!m || m.role !== 'universitystaff' || m.permission_level !== 'admin') {
        router.push('/portal/programs')
        return
      }
      setIsAdmin(true)
      const p = await authFetch<ProgramDetail>(`programs/${programId}/`)
      setName(p.name)
      setDegreeLevel(p.degree_level)
      setDescription(p.description || '')
      setRequirements(p.requirements || '')
      setFeeAmount(p.fee_amount)
      setStatus(p.status)
      setDocs(
        p.required_documents && p.required_documents.length > 0
          ? p.required_documents.map((d) => ({ type: d.type, label: d.label }))
          : [{ type: '', label: '' }],
      )
    }).catch(() => {
      router.push('/portal/programs')
    }).finally(() => {
      setLoading(false)
    })
  }, [programId, router])

  function handleDocChange(index: number, field: 'type' | 'label', value: string) {
    setDocs((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  function addDocRow() {
    setDocs((prev) => [...prev, { type: '', label: '' }])
  }

  function removeDocRow(index: number) {
    setDocs((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!programId || saving) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await authFetch(`programs/${programId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          degree_level: degreeLevel,
          description,
          requirements,
          fee_amount: feeAmount,
          fee_currency: 'USD',
          required_documents: docs.filter((d) => d.type.trim() && d.label.trim()),
        }),
      })
      setSuccess('Program updated successfully.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update program')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusTransition(newStatus: 'published' | 'archived') {
    if (!programId) return
    setConfirmAction(null)
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      await authFetch(`programs/${programId}/status/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setStatus(newStatus)
      setSuccess(
        newStatus === 'published'
          ? 'Program published successfully.'
          : 'Program archived.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${newStatus} program`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="bg-surface rounded-lg border border-border shadow-sm p-8 space-y-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-6 w-40" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Edit Program"
        breadcrumb={[
          { label: 'Programs', href: '/portal/programs' },
          { label: 'Edit', href: '#' },
        ]}
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

      {status === 'archived' && (
        <Alert variant="info" className="mb-6">
          This program is archived.
        </Alert>
      )}

      <Card padding="lg" className="max-w-2xl">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
              Program Details
            </h2>
            <div className="space-y-4">
              <FormField label="Name" htmlFor="name" required>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FormField>
              <FormField label="Degree Level" htmlFor="degreeLevel" required>
                <Select
                  id="degreeLevel"
                  value={degreeLevel}
                  onChange={(e) => setDegreeLevel(e.target.value)}
                >
                  <option value="undergraduate">Undergraduate</option>
                  <option value="postgraduate">Postgraduate</option>
                </Select>
              </FormField>
              <FormField label="Description" htmlFor="description">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </FormField>
              <FormField
                label="Requirements"
                htmlFor="requirements"
                hint="Entry requirements, qualifications needed"
              >
                <Textarea
                  id="requirements"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={4}
                />
              </FormField>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
              Application Fee
            </h2>
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <FormField label="Fee Amount" htmlFor="feeAmount" required>
                  <Input
                    id="feeAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={feeAmount}
                    onChange={(e) => setFeeAmount(e.target.value)}
                    required
                  />
                </FormField>
              </div>
              <div className="w-32">
                <FormField label="Currency" htmlFor="currency">
                  <Select id="currency" value="USD" disabled>
                    <option value="USD">USD</option>
                  </Select>
                </FormField>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
              Required Documents
            </h2>
            <div className="space-y-3">
              {docs.map((doc, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Type (e.g. transcript)"
                      value={doc.type}
                      onChange={(e) => handleDocChange(i, 'type', e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Label"
                      value={doc.label}
                      onChange={(e) => handleDocChange(i, 'label', e.target.value)}
                    />
                  </div>
                  {docs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocRow(i)}
                      className="mt-1 shrink-0"
                      aria-label="Remove document"
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={addDocRow}>
                Add Document
              </Button>
            </div>
          </section>

          <div className="flex items-center gap-3 pt-4 border-t border-border">
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
            >
              Save Changes
            </Button>
            {status === 'draft' && (
              <Button
                variant="primary"
                loading={saving}
                onClick={() => setConfirmAction('publish')}
              >
                Publish Program
              </Button>
            )}
            {status === 'published' && (
              <Button
                variant="secondary"
                loading={saving}
                onClick={() => setConfirmAction('archive')}
              >
                Archive Program
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Modal
        open={confirmAction === 'publish'}
        onClose={() => setConfirmAction(null)}
        title="Publish Program"
      >
        <p className="text-sm text-text-600 mb-6">
          This program will be visible to applicants and they will be able to submit
          applications. Are you sure?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => handleStatusTransition('published')}>
            Publish
          </Button>
        </div>
      </Modal>

      <Modal
        open={confirmAction === 'archive'}
        onClose={() => setConfirmAction(null)}
        title="Archive Program"
      >
        <p className="text-sm text-text-600 mb-6">
          This program will be hidden from applicants. This action cannot be undone.
          Are you sure?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmAction(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => handleStatusTransition('archived')}>
            Archive
          </Button>
        </div>
      </Modal>
    </div>
  )
}
