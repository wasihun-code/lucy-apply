'use client'

import { Suspense, useState, useEffect, FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getMe, type AuthUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { AuthCard } from '@/components/layout/AuthCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Shield } from 'lucide-react'

async function apiPost(path: string, body: unknown): Promise<Response> {
  return fetch(`/api/proxy/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function computeDefaultRedirect(me: AuthUser): string {
  if (me.role === 'platformadmin') return '/platform_admin/universities'
  if (me.role === 'universitystaff') return '/portal/applications'
  return '/dashboard'
}

function MFAVerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFromUrl = searchParams.get('redirect')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [lockedOut, setLockedOut] = useState(false)
  const [redirectTo, setRedirectTo] = useState('/dashboard')

  useEffect(() => {
    getMe().then((me) => {
      if (!me) {
        router.replace('/login')
        return
      }
      const target = redirectFromUrl || computeDefaultRedirect(me)
      setRedirectTo(target)
      if (!me.mfa_enabled || localStorage.getItem('mfa_setup_pending') === 'true') {
        localStorage.setItem('mfa_setup_pending', 'true')
        router.replace('/mfa/setup')
        return
      }
      if (me.mfa_verified) {
        router.replace(target)
      }
    })
  }, [router, redirectFromUrl])

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await apiPost('auth/mfa/verify/', { code })
      if (res.ok) {
        document.cookie = 'mfa_trusted=true; path=/; max-age=900'
        localStorage.removeItem('mfa_setup_pending')
        router.replace(redirectTo)
        return
      }
      const body = await res.json().catch(() => null)
      if (res.status === 429) {
        setLockedOut(true)
        setError('Too many incorrect attempts. Please wait 5 minutes before trying again.')
        return
      }
      setRemainingAttempts(body?.remaining_attempts ?? null)
      setError(body?.error?.message || body?.detail || 'Invalid code')
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout/', { method: 'POST' })
    } catch {}
    router.push('/login')
  }

  return (
    <AuthCard title="Two-factor authentication">
      <div className="flex justify-center mb-4">
        <div className="bg-primary-soft text-primary rounded-xl p-3">
          <Shield size={40} />
        </div>
      </div>

      <p className="text-sm text-text-600 text-center mt-2 mb-6">
        Enter the 6-digit code from your authenticator app.
      </p>

      {lockedOut ? (
        <Alert variant="danger" className="mb-4">
          Too many incorrect attempts. Please wait 5 minutes before trying again.
        </Alert>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-2xl tracking-[0.5em] font-mono"
            autoFocus
            required
          />

          {remainingAttempts !== null && (
            <p className="text-xs text-warning mt-1 text-center">
              {remainingAttempts} attempts remaining before lockout
            </p>
          )}

          <Button variant="primary" size="lg" className="w-full" loading={loading} disabled={code.length !== 6}>
            Verify
          </Button>
        </form>
      )}

      <div className="mt-4">
        <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
          Sign in with a different account
        </Button>
      </div>
    </AuthCard>
  )
}

export default function MFAVerifyPage() {
  return (
    <Suspense fallback={null}>
      <MFAVerifyForm />
    </Suspense>
  )
}
