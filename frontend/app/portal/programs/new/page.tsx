'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
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

interface DocRow {
  type: string
  label: string
}

export default function NewProgramPage() {
  const router = useRouter()
  const [universityId, setUniversityId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [degreeLevel, setDegreeLevel] = useState('undergraduate')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [feeAmount, setFeeAmount] = useState('')
  const [docs, setDocs] = useState<DocRow[]>([{ type: '', label: '' }])

  useEffect(() => {
    getMe().then((m) => {
      if (!m || m.role !== 'universitystaff' || m.permission_level !== 'admin' || !m.university) {
        router.push('/portal/programs')
        return
      }
      setUniversityId(m.university)
    })
  }, [router])

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

  async function handleSubmit(status: 'draft' | 'published') {
    if (!universityId || saving) return

    const validDocs = docs.filter((d) => d.type.trim() && d.label.trim())
    if (validDocs.length === 0) {
      setError('At least one required document must be specified.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await authFetch(`universities/${universityId}/programs/`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          degree_level: degreeLevel,
          description,
          requirements,
          fee_amount: feeAmount,
          fee_currency: 'USD',
          required_documents: validDocs,
          status,
        }),
      })
      router.push('/portal/programs')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="New Program"
        breadcrumb={[
          { label: 'Programs', href: '/portal/programs' },
          { label: 'New', href: '/portal/programs/new' },
        ]}
      />

      {error && (
        <Alert variant="danger" className="mb-6">
          {error}
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
                  placeholder="e.g. Bachelor of Computer Science"
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
                  placeholder="Program description"
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
                  placeholder="Admission requirements"
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
                    placeholder="0.00"
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
              variant="secondary"
              loading={saving}
              onClick={() => handleSubmit('draft')}
            >
              Save as Draft
            </Button>
            <Button
              variant="primary"
              loading={saving}
              onClick={() => handleSubmit('published')}
            >
              Save &amp; Publish
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
