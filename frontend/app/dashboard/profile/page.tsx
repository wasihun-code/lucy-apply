'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe, type AuthUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { Pencil, Shield, KeyRound, Smartphone, CheckCircle2, Mail } from 'lucide-react'

type ApplicantProfile = {
  id: string
  email: string
  full_name: string
  country_of_residence: string
  date_of_birth: string
  nationality: string
  email_verified: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ApplicantProfile | null>(null)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordSending, setPasswordSending] = useState(false)
  const [passwordSent, setPasswordSent] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    country_of_residence: '',
    date_of_birth: '',
    nationality: '',
  })

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const me = await getMe()
        if (!me) {
          router.push('/login')
          return
        }
        setAuthUser(me)

        const res = await fetch('/api/proxy/applicants/me/')
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || `HTTP ${res.status}`)
        }
        const data: ApplicantProfile = await res.json()
        if (!cancelled) {
          setProfile(data)
          setFormData({
            full_name: data.full_name || '',
            country_of_residence: data.country_of_residence || '',
            date_of_birth: data.date_of_birth || '',
            nationality: data.nationality || '',
          })
        }
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [router])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(null)
    setError(null)

    try {
      const changed: Record<string, string> = {}
      if (formData.full_name !== profile?.full_name) changed.full_name = formData.full_name
      if (formData.country_of_residence !== profile?.country_of_residence) changed.country_of_residence = formData.country_of_residence
      if (formData.date_of_birth !== (profile?.date_of_birth ?? '')) changed.date_of_birth = formData.date_of_birth
      if (formData.nationality !== (profile?.nationality ?? '')) changed.nationality = formData.nationality

      const res = await fetch('/api/proxy/applicants/me/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changed),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg = body?.detail || body?.message || body?.error?.message || `HTTP ${res.status}`
        throw new Error(msg)
      }
      const updated: ApplicantProfile = await res.json()
      setProfile(updated)
      setFormData({
        full_name: updated.full_name || '',
        country_of_residence: updated.country_of_residence || '',
        date_of_birth: updated.date_of_birth || '',
        nationality: updated.nationality || '',
      })
      setEditing(false)
      setSuccess('Profile updated.')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (!profile) return
    setFormData({
      full_name: profile.full_name || '',
      country_of_residence: profile.country_of_residence || '',
      date_of_birth: profile.date_of_birth || '',
      nationality: profile.nationality || '',
    })
    setEditing(false)
    setError(null)
  }

  async function handleSendPasswordReset() {
    if (!profile) return
    setPasswordSending(true)
    setPasswordError(null)
    try {
      const res = await fetch('/api/proxy/auth/forgot-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile.email }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const msg = body?.detail || body?.message || body?.error?.message || `HTTP ${res.status}`
        throw new Error(msg)
      }
      setPasswordSent(true)
    } catch (e) {
      setPasswordError(getErrorMessage(e))
    } finally {
      setPasswordSending(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-9 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" />
        <Alert variant="danger">{error}</Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" />

      {success && <Alert variant="success">{success}</Alert>}

      <Card padding="md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold text-text-900">
            Personal Information
          </h2>
          {!editing && (
            <Button variant="ghost" size="sm" icon={<Pencil size={16} />} onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <FormField label="Full Name" htmlFor="full_name" required>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Email" htmlFor="email" hint="To change your email, contact support.">
              <div className="relative">
                <Input
                  id="email"
                  value={profile?.email || ''}
                  readOnly
                  className="bg-background text-text-400 cursor-not-allowed"
                  tabIndex={-1}
                />
              </div>
            </FormField>

            <FormField label="Country of Residence" htmlFor="country_of_residence">
              <Input
                id="country_of_residence"
                value={formData.country_of_residence}
                onChange={(e) => setFormData({ ...formData, country_of_residence: e.target.value })}
              />
            </FormField>

            <FormField label="Date of Birth" htmlFor="date_of_birth">
              <Input
                id="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </FormField>

            <FormField label="Nationality" htmlFor="nationality">
              <Input
                id="nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </FormField>

            {error && <Alert variant="danger">{error}</Alert>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" loading={saving}>
                Save Changes
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-text-400">Full Name</dt>
              <dd className="text-sm text-text-900 font-medium">{profile?.full_name || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-400">Email</dt>
              <dd className="text-sm text-text-900 font-medium">{profile?.email || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-400">Country of Residence</dt>
              <dd className="text-sm text-text-900 font-medium">{profile?.country_of_residence || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-400">Date of Birth</dt>
              <dd className="text-sm text-text-900 font-medium">
                {profile?.date_of_birth
                  ? new Date(profile.date_of_birth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-400">Nationality</dt>
              <dd className="text-sm text-text-900 font-medium">{profile?.nationality || '-'}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
          Account Security
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <KeyRound size={20} className="text-text-400" />
              <div>
                <p className="text-sm font-medium text-text-900">Password</p>
                <p className="text-xs text-text-400">Last changed: Unknown</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPasswordModal(true)}>
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-text-400" />
              <div>
                <p className="text-sm font-medium text-text-900">Two-Factor Authentication</p>
                <p className="text-xs text-text-400">
                  Status: {authUser?.mfa_enabled ? 'Enabled' : 'Not enabled'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Modal open={showPasswordModal} onClose={() => { setShowPasswordModal(false); setPasswordSent(false); setPasswordError(null) }} title="Change Password">
        {passwordSent ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-success/10 text-success rounded-full p-3">
                <CheckCircle2 size={32} />
              </div>
            </div>
            <Alert variant="success">
              If that email is registered, a reset link is on its way.
            </Alert>
            <p className="text-sm text-text-600 text-center">
              Check your inbox for the password reset email.
            </p>
            <div className="flex justify-center pt-2">
              <Button variant="secondary" size="sm" onClick={() => { setShowPasswordModal(false); setPasswordSent(false) }}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-primary-soft text-primary p-4 rounded-lg">
              <Mail size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">
                For security, password changes are sent via email. We&apos;ll send a
                password reset link to <strong>{profile?.email}</strong>.
              </p>
            </div>

            {passwordError && <Alert variant="danger">{passwordError}</Alert>}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setShowPasswordModal(false); setPasswordError(null) }}>
                Cancel
              </Button>
              <Button variant="primary" loading={passwordSending} onClick={handleSendPasswordReset}>
                Send Reset Link
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
