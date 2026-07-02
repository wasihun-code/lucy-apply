'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getMe, type AuthUser } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { AuthCard } from '@/components/layout/AuthCard'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { ShieldCheck, ShieldOff } from 'lucide-react'

async function apiPost(path: string, body: unknown): Promise<Response> {
  return fetch(`/api/proxy/${path.replace(/^\//, '')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function extractProvisioningSecret(uri: string | undefined): string | null {
  if (!uri) return null
  try {
    const parsed = new URL(uri)
    return parsed.searchParams.get('secret')
  } catch {
    const match = uri.match(/secret=([^&]+)/)
    return match ? decodeURIComponent(match[1]) : null
  }
}

export default function MFASetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [lockedOut, setLockedOut] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)

  function mfaRedirect(me: AuthUser) {
    if (me.role === 'platformadmin') return '/platform_admin/universities'
    if (me.role === 'universitystaff') return '/portal/applications'
    return '/dashboard'
  }

  useEffect(() => {
    getMe().then((me) => {
      if (!me) {
        router.replace('/login')
        return
      }
      setUser(me)
      if (me.mfa_enabled && me.mfa_verified) {
        localStorage.removeItem('mfa_setup_pending')
        router.replace(mfaRedirect(me))
        return
      }
      localStorage.setItem('mfa_setup_pending', 'true')
      apiPost('auth/mfa/setup/', {}).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          setError(body?.error?.message || body?.detail || 'Failed to set up MFA'); setProvisioningUri(null)
          return
        }
        const data = await res.json()
        setProvisioningUri(data.provisioning_uri)
      }).catch((e) => {
        setError(getErrorMessage(e))
      }).finally(() => {
        setLoading(false)
      })
    })
  }, [router])

  async function handleVerify(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setVerifying(true)
    try {
      const res = await apiPost('auth/mfa/verify/', { code })
      if (res.ok) {
        document.cookie = 'mfa_trusted=true; path=/; max-age=900'
        localStorage.removeItem('mfa_setup_pending')
        router.replace(user ? mfaRedirect(user) : '/dashboard')
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
      setVerifying(false)
    }
  }

  const secret = provisioningUri ? extractProvisioningSecret(provisioningUri) : null

  if (loading) {
    return (
      <AuthCard title="Set up two-factor authentication">
        <div className="flex justify-center py-8">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-40 h-40 bg-border rounded-lg" />
            <div className="h-4 w-48 bg-border rounded" />
          </div>
        </div>
      </AuthCard>
    )
  }

  if (error && !provisioningUri) {
    return (
      <AuthCard title="Set up two-factor authentication">
        <Alert variant="danger">{error}</Alert>
        <div className="flex justify-center mt-4">
          <Button variant="ghost" onClick={() => router.replace('/login')}>
            Back to login
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Set up two-factor authentication">
      {/* Step 1: QR Code */}
      {provisioningUri && (
        <>
          <div className="flex justify-center mb-4">
            <div className="bg-primary-soft text-primary rounded-xl p-3">
              <ShieldCheck size={40} />
            </div>
          </div>

          <p className="text-sm text-text-600 text-center mt-2 mb-6">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          <div className="flex justify-center mb-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(provisioningUri)}`}
              alt="MFA QR Code"
              className="rounded-lg shadow-sm bg-white"
              width={200}
              height={200}
            />
          </div>

          {secret && (
            <details className="mt-4 mb-6">
              <summary className="text-sm text-primary cursor-pointer text-center">
                Can&apos;t scan? Enter code manually
              </summary>
              <p className="font-mono text-sm bg-background p-3 rounded mt-2 text-center select-all">
                {secret}
              </p>
            </details>
          )}

          {/* Step 2: Verify */}
          <p className="text-sm text-text-600 mt-6 mb-4 text-center">
            Enter the 6-digit code from your app to confirm setup:
          </p>
        </>
      )}

      {lockedOut && (
        <Alert variant="danger" className="mb-4">
          Too many incorrect attempts. Please wait 5 minutes before trying again.
        </Alert>
      )}

      {!lockedOut && (
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
            <p className="text-xs text-warning text-center">
              {remainingAttempts} attempts remaining
            </p>
          )}

          <Button variant="primary" size="lg" className="w-full" loading={verifying} disabled={code.length !== 6}>
            Verify & Enable
          </Button>
        </form>
      )}

      {lockedOut && (
        <div className="flex justify-center mt-4">
          <Button variant="ghost" size="sm" onClick={() => {
            fetch('/api/auth/logout/', { method: 'POST' }).finally(() => router.push('/login'))
          }}>
            Sign in with a different account
          </Button>
        </div>
      )}
    </AuthCard>
  )
}
