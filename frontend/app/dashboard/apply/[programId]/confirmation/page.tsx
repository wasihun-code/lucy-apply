'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'
import type { Application } from '@/lib/api'

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
    const msg = text.length > 200 ? `HTTP ${res.status}` : text || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return res.json()
}

export default function ConfirmationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const appId = searchParams.get('appId')

  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) {
      setError('No application ID provided.')
      setLoading(false)
      return
    }

    async function load() {
      try {
        const app = await authFetch<Application>(`applications/${appId}/`)
        setApplication(app)
      } catch {
        setError('Failed to load application details.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [appId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center py-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="space-y-4">
        <Alert variant="danger">{error ?? 'Application not found.'}</Alert>
        <Link href="/dashboard">
          <Button variant="ghost">&larr; Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Success header */}
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-success" />
        </div>
        <h1 className="text-3xl font-display font-bold text-text-900 mb-2">
          Application Submitted
        </h1>
        <p className="text-base text-text-600 max-w-md">
          Your application to <strong>{application.program_name}</strong> has been received.
        </p>
        <p className="text-sm text-text-400 mt-2">
          You will receive a confirmation email once the university reviews your application.
        </p>
      </div>

      {/* Application details card */}
      <Card padding="lg">
        <h2 className="text-xl font-display font-semibold text-text-900 mb-4">
          Application Details
        </h2>
        <div className="space-y-3">
          <DetailRow label="Status" value={<StatusBadge status={application.status} />} />
          <DetailRow label="Program" value={application.program_name} />
          <DetailRow label="University" value={application.university_name} />
          <DetailRow
            label="Application ID"
            value={<span className="font-mono text-xs">{application.id}</span>}
          />
          {application.submitted_at && (
            <DetailRow
              label="Submitted"
              value={new Date(application.submitted_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
          )}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
        <Link href={`/dashboard/applications/${application.id}`}>
          <Button variant="secondary">View Application</Button>
        </Link>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <span className="text-sm text-text-600 font-medium">{label}</span>
      <div className="text-sm text-text-900 text-right">{value}</div>
    </div>
  )
}
