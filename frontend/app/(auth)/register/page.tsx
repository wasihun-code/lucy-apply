'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { AuthCard } from '@/components/layout/AuthCard'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { fetchAPI, getErrorMessage } from '@/lib/api'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await fetchAPI('/auth/register/', {
        method: 'POST',
        body: JSON.stringify({
          email,
          full_name: fullName,
          password,
          country_of_residence: country,
        }),
      })

      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard title="Create your account">
        <Alert variant="success">
          Check your email to verify your account.
        </Alert>
        <p className="mt-6 text-center text-sm font-body font-normal text-text-600">
          <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
            Back to login
          </Link>
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Create your account" subtitle="Start your application to Ethiopian universities today.">
      {error && (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Full Name" htmlFor="fullName" required>
          <Input type="text" id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </FormField>
        <FormField label="Email" htmlFor="email" required>
          <Input type="email" id="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField label="Password" htmlFor="password" hint="Minimum 8 characters" required>
          <Input type="password" id="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FormField>
        <FormField label="Country of Residence" htmlFor="country" hint="Where you currently live" required>
          <Input type="text" id="country" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} required />
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Create Account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm font-body font-normal text-text-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}
