'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/layout/AuthCard'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { fetchAPI } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await fetchAPI('/auth/forgot-password/', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    } catch {
      // Security hardening: same response regardless of whether email exists
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <AuthCard title="Reset your password">
        <Alert variant="success">
          If that email is registered, a reset link is on its way.
        </Alert>
        <p className="mt-6 text-center text-sm font-body font-normal text-text-600">
          <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
            &larr; Back to login
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email" htmlFor="email" required>
          <Input type="email" id="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Send Reset Link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm font-body font-normal text-text-600">
        <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
          &larr; Back to login
        </Link>
      </p>
    </AuthCard>
  )
}
