'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe, type AuthUser } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { EmptyState } from '@/components/shared/EmptyState'
import { ApplicationCard } from '@/components/shared/ApplicationCard'
import { FileText, Clock, ClipboardCheck, CheckCircle2 } from 'lucide-react'
import type { Application, PaginatedResponse } from '@/lib/api'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const me = await getMe()
        if (!me) {
          router.push('/login')
          return
        }
        setUser(me)

        const appsRes = await fetch('/api/proxy/applications/')
        if (!appsRes.ok) {
          const text = await appsRes.text()
          throw new Error(
            text.length > 200 ? 'Failed to load applications' : text || 'Failed to load applications',
          )
        }
        const appsData: PaginatedResponse<Application> = await appsRes.json()
        setApplications(appsData.results)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [router])

  if (loading) {
    return <DashboardSkeleton />
  }

  const firstName = user?.full_name?.split(' ')[0] || 'there'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const underReview = applications.filter((a) => a.status === 'under_review').length
  const decisions = applications.filter((a) =>
    ['admitted', 'rejected', 'waitlisted'].includes(a.status),
  ).length
  const accepted = applications.filter((a) => a.status === 'accepted').length

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-900">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-text-400 mt-1">{today}</p>
      </div>

      {/* Error state */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-text-900">{applications.length}</p>
              <p className="text-sm text-text-600 mt-1">Total Applications</p>
            </div>
            <FileText className="text-text-400" size={24} />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-text-900">{underReview}</p>
              <p className="text-sm text-text-600 mt-1">Pending Review</p>
            </div>
            <Clock className="text-text-400" size={24} />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-text-900">{decisions}</p>
              <p className="text-sm text-text-600 mt-1">Decisions</p>
            </div>
            <ClipboardCheck className="text-text-400" size={24} />
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-text-900">{accepted}</p>
              <p className="text-sm text-text-600 mt-1">Accepted</p>
            </div>
            <CheckCircle2 className="text-text-400" size={24} />
          </div>
        </Card>
      </div>

      {/* Applications section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-text-900">My Applications</h2>
        <Link href="/universities">
          <Button variant="primary" size="sm">
            Browse Programs
          </Button>
        </Link>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          heading="No applications yet"
          description="Browse universities and programs to start your first application."
          action={{ label: 'Browse Programs', href: '/universities' }}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="animate-pulse bg-border rounded h-8 w-64" />
        <div className="animate-pulse bg-border rounded h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface rounded-lg border border-border shadow-sm p-6 space-y-3"
          >
            <div className="animate-pulse bg-border rounded h-8 w-12" />
            <div className="animate-pulse bg-border rounded h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="animate-pulse bg-border rounded h-6 w-40" />
        <div className="animate-pulse bg-border rounded h-10 w-36" />
      </div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 border-b border-border"
        >
          <div className="flex-1 space-y-2">
            <div className="animate-pulse bg-border rounded h-4 w-2/5" />
            <div className="animate-pulse bg-border rounded h-3 w-3/5" />
          </div>
          <div className="animate-pulse bg-border rounded h-6 w-16" />
        </div>
      ))}
    </div>
  )
}
