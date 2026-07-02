'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import { AuthCard } from '@/components/layout/AuthCard'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkedAuth, setCheckedAuth] = useState(false)

  useEffect(() => {
    if (checkedAuth) return
    setCheckedAuth(true)
    getMe().then((me) => {
      if (!me) return
      if (me.role === 'universitystaff') {
        if (!me.mfa_enabled || localStorage.getItem('mfa_setup_pending') === 'true') { 
          localStorage.setItem('mfa_setup_pending', 'true')
          router.replace('/mfa/setup')
          return 
        }
        if (!me.mfa_verified) { router.replace('/mfa/verify?redirect=/portal/applications'); return }
        router.replace('/portal/applications')
      } else if (me.role === 'platformadmin') {
        if (!me.mfa_enabled || localStorage.getItem('mfa_setup_pending') === 'true') { 
          localStorage.setItem('mfa_setup_pending', 'true')
          router.replace('/mfa/setup')
          return 
        }
        if (!me.mfa_verified) { router.replace('/mfa/verify?redirect=/platform_admin/universities'); return }
        router.replace('/platform_admin/universities')
      } else {
        if (!me.mfa_enabled || localStorage.getItem('mfa_setup_pending') === 'true') { 
          localStorage.setItem('mfa_setup_pending', 'true')
          router.replace('/mfa/setup')
          return 
        }
        if (!document.cookie.includes('mfa_trusted=true')) { router.replace('/mfa/verify?redirect=/dashboard'); return }
        router.replace('/dashboard')
      }
    })
  }, [router, checkedAuth])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || data.detail || 'Login failed')
      }

      const me = await getMe()
      if (!me) {
        throw new Error('Failed to load user profile')
      }

      if (me.role === 'universitystaff') {
        if (!me.mfa_enabled || localStorage.getItem('mfa_setup_pending') === 'true') {
          localStorage.setItem('mfa_setup_pending', 'true')
          router.push('/mfa/setup')
          return
        }
        if (!me.mfa_verified) {
          router.push('/mfa/verify?redirect=/portal/applications')
          return
        }
        router.push('/portal/applications')
        return
      }
      if (me.role === 'platformadmin') {
        if (!me.mfa_enabled || localStorage.getItem('mfa_setup_pending') === 'true') {
          localStorage.setItem('mfa_setup_pending', 'true')
          router.push('/mfa/setup')
          return
        }
        if (!me.mfa_verified) {
          router.push('/mfa/verify?redirect=/platform_admin/universities')
          return
        }
        router.push('/platform_admin/universities')
        return
      }
      if (!me.mfa_enabled || localStorage.getItem('mfa_setup_pending') === 'true') {
        localStorage.setItem('mfa_setup_pending', 'true')
        router.push('/mfa/setup')
        return
      }
      if (!document.cookie.includes('mfa_trusted=true')) {
        router.push('/mfa/verify?redirect=/dashboard')
        return
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard title="Sign in to Lucy Apply" subtitle="Welcome back. Enter your credentials to continue.">
      {error && (
        <div className="mb-4">
          <Alert variant="danger">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email" htmlFor="email" required>
          <Input type="email" id="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FormField>
        <FormField label="Password" htmlFor="password" required>
          <Input type="password" id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="mt-1 text-right">
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:text-primary-dark transition-colors">
              Forgot password?
            </Link>
          </div>
        </FormField>
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Sign In
        </Button>
      </form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs font-body font-normal text-text-400">
          <span className="bg-surface px-2">or</span>
        </div>
      </div>
      <p className="text-center text-sm font-body font-normal text-text-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-primary hover:text-primary-dark transition-colors">
          Register
        </Link>
      </p>
    </AuthCard>
  )
}
