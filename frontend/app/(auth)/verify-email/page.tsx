'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle } from 'lucide-react'
import { AuthCard } from '@/components/layout/AuthCard'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Skeleton } from '@/components/ui/Skeleton'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { fetchAPI } from '@/lib/api'

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    try {
      const body = JSON.parse(e.message)
      return body?.error?.message || body?.detail || body?.message || 'Verification failed'
    } catch {
      return e.message
    }
  }
  return 'Something went wrong. Please try again.'
}

function VerifyEmailForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const emailParam = searchParams.get('email')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState(emailParam || '')
  const [resendSent, setResendSent] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token || !emailParam) {
      setStatus('error')
      setError('Invalid verification link.')
      return
    }

    let cancelled = false

    async function verify() {
      try {
        await fetchAPI('/auth/verify-email/', {
          method: 'POST',
          body: JSON.stringify({ email: emailParam, token }),
        })
        if (!cancelled) setStatus('success')
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setError(getErrorMessage(err))
        }
      }
    }

    verify()
    return () => { cancelled = true }
  }, [token, emailParam])

  async function handleResend() {
    setResending(true)
    try {
      await fetchAPI('/auth/resend-verification/', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail }),
      })
    } catch {
      // Always succeeds per security hardening
    } finally {
      setResending(false)
      setResendSent(true)
    }
  }

  if (status === 'loading') {
    return (
      <AuthCard title="Verify your email">
        <Skeleton className="h-32 w-full" />
      </AuthCard>
    )
  }

  if (status === 'success') {
    return (
      <AuthCard title="Email verified!">
        <div className="flex flex-col items-center text-center">
          <CheckCircle size={48} className="text-success mb-4" />
          <p className="text-sm font-body font-normal text-text-600 mb-6">
            Your account is ready. You can now sign in and start applying.
          </p>
          <Link href="/login">
            <Button variant="primary" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Verification failed">
      <div className="flex flex-col items-center text-center">
        <XCircle size={48} className="text-danger mb-4" />
        <p className="text-sm font-body font-normal text-text-600 mb-2">
          {error || 'This link may have expired.'}
        </p>
        <p className="text-sm font-body font-normal text-text-600 mb-6">
          Request a new verification email.
        </p>
        {resendSent ? (
          <Alert variant="success" className="mb-4">
            Verification email sent.
          </Alert>
        ) : (
          <div className="w-full space-y-3">
            {!emailParam && (
              <FormField label="Email" htmlFor="resendEmail" required>
                <Input type="email" id="resendEmail" autoComplete="email" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} required />
              </FormField>
            )}
            <Button variant="primary" size="lg" className="w-full" loading={resending} onClick={handleResend} disabled={!resendEmail}>
              Resend verification email
            </Button>
          </div>
        )}
        {resendSent && (
          <Link href="/login" className="mt-4 text-sm font-medium text-primary hover:text-primary-dark transition-colors">
            Go to login
          </Link>
        )}
      </div>
    </AuthCard>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthCard title="Verify your email"><Skeleton className="h-32 w-full" /></AuthCard>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
