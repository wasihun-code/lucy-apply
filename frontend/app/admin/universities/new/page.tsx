'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Alert } from '@/components/ui/Alert'

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

export default function NewUniversityPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [accreditation, setAccreditation] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')

  useEffect(() => {
    getMe().then((me) => {
      if (!me || me.role !== 'platformadmin') router.push('/login')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await authFetch('universities/', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || undefined,
          accreditation_info: accreditation || undefined,
          initial_admin_email: adminEmail,
          initial_admin_name: adminName,
        }),
      })
      setCreatedName(name)
      setSuccess(
        `University created. An invitation has been sent to ${adminEmail}. The university is currently inactive until the admin completes setup.`,
      )
      setName('')
      setDescription('')
      setAccreditation('')
      setAdminName('')
      setAdminEmail('')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Onboard University"
        breadcrumb={[
          { label: 'Universities', href: '/admin/universities' },
          { label: 'New', href: '/admin/universities/new' },
        ]}
      />

      {success && (
        <Alert variant="success" className="mb-6">
          <p>{success}</p>
          <Link href="/admin/universities" className="mt-3 inline-block">
            <Button variant="primary" size="sm">
              View Universities
            </Button>
          </Link>
        </Alert>
      )}

      {!success && (
        <Card className="p-6">
          {error && (
            <Alert variant="danger" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-base font-display font-semibold text-text-900 mb-4">
                University Details
              </h2>
              <div className="space-y-4">
                <FormField label="Name" htmlFor="name" required>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. University of Nairobi"
                  />
                </FormField>
                <FormField label="Description" htmlFor="description">
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description of the university"
                  />
                </FormField>
                <FormField
                  label="Accreditation Info"
                  htmlFor="accreditation"
                  hint="Accreditation body, certification details"
                >
                  <Textarea
                    id="accreditation"
                    value={accreditation}
                    onChange={(e) => setAccreditation(e.target.value)}
                    rows={3}
                    placeholder="e.g. Accredited by the National Universities Commission"
                  />
                </FormField>
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <h2 className="text-base font-display font-semibold text-text-900 mb-4">
                Initial Admin Account
              </h2>
              <p className="text-sm text-text-600 mb-4">
                The admin will receive an invitation email to set their password.
              </p>
              <div className="space-y-4">
                <FormField label="Admin Full Name" htmlFor="adminName" required>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    required
                    placeholder="e.g. Jane Smith"
                  />
                </FormField>
                <FormField label="Admin Email" htmlFor="adminEmail" required>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                    placeholder="jane@university.edu"
                  />
                </FormField>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="primary" type="submit" loading={saving}>
                Create University & Send Invitation
              </Button>
              <Link href="/admin/universities">
                <Button variant="secondary" type="button">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
