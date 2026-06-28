'use client'

import { useState, FormEvent, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AuthCard } from '@/components/layout/AuthCard'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchAPI } from '@/lib/api'

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    try {
      const body = JSON.parse(e.message)
      return body?.error?.message || body?.detail || body?.message || e.message
    } catch {
      return e.message
    }
  }
  return 'Something went wrong. Please try again.'
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setValidationError('')

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }

    if (!token || !email) {
      setError('Invalid or expired reset link.')
      return
    }

    setLoading(true)

    try {
      await fetchAPI('/auth/reset-password/', {
        method: 'POST',
        body: JSON.stringify({ email, token, new_password: password }),
      })
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title="Set new password">
        <Alert variant="danger">Invalid or expired reset link.</Alert>
      </AuthCard>
    )
  }

  if (success) {
    return (
      <AuthCard title="Set new password" subtitle="Password updated. You can now sign in.">
        <Alert variant="success">Password updated. You can now sign in.</Alert>
        <Link href="/login">
          <Button variant="primary" size="lg" className="w-full mt-6">
            Go to login
          </Button>
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Set new password">
      {error && (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}
      {validationError && (
        <div className="mb-4">
          <Alert variant="danger">{validationError}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="New Password" htmlFor="password" hint="Minimum 8 characters" required>
          <Input type="password" id="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FormField>
        <FormField label="Confirm Password" htmlFor="confirmPassword" required>
          <Input type="password" id="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setValidationError('') }} required />
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Update Password
        </Button>
      </form>
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCard title="Set new password"><Skeleton className="h-32 w-full" /></AuthCard>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
