'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMe } from '@/lib/auth'
import { getErrorMessage } from '@/lib/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Receipt, ArrowRight } from 'lucide-react'

type PaymentData = {
  id: string
  amount: string
  currency: string
  status: 'pending' | 'succeeded' | 'failed'
  refundable: boolean
  initiated_at: string
  completed_at: string | null
}

type AppSummary = {
  id: string
  program_name: string
  university_name: string
}

type PaymentCard = {
  payment: PaymentData
  app: AppSummary
}

export default function FinancesPage() {
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadPayments() {
      try {
        const me = await getMe()
        if (!me) {
          router.push('/login')
          return
        }
        const appsRes = await fetch('/api/proxy/applications/')
        if (!appsRes.ok) {
          const text = await appsRes.text()
          throw new Error(text || `HTTP ${appsRes.status}`)
        }
        const appsJson = await appsRes.json()
        const apps: AppSummary[] = (appsJson.results || []).map(
          (a: { id: string; program_name: string; university_name: string }) => ({
            id: a.id,
            program_name: a.program_name,
            university_name: a.university_name,
          }),
        )

        const results: PaymentCard[] = []
        for (const app of apps) {
          const payRes = await fetch(`/api/proxy/applications/${app.id}/payment/`)
          if (!payRes.ok) continue
          const payment: PaymentData = await payRes.json()
          results.push({ payment, app })
        }

        if (!cancelled) setPayments(results)
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPayments()
    return () => { cancelled = true }
  }, [router])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-12 w-full rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Finances" description="Your application fee payment history." />
        <Alert variant="danger">{error}</Alert>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Finances" description="Your application fee payment history." />
        <Alert variant="info">
          Application fees are non-refundable per our payment policy.
        </Alert>
        <EmptyState
          icon={<Receipt size={48} />}
          heading="No payments yet"
          description="Payment records will appear here after you pay an application fee."
        />
      </div>
    )
  }

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'succeeded': return 'active' as const
      case 'pending': return 'pending' as const
      case 'failed': return 'rejected' as const
      default: return 'neutral' as const
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'succeeded': return 'Paid'
      case 'pending': return 'Pending'
      case 'failed': return 'Failed'
      default: return status
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Finances" description="Your application fee payment history." />
      <Alert variant="info">
        Application fees are non-refundable per our payment policy.
      </Alert>

      <div className="space-y-4">
        {payments.map(({ payment, app }) => (
          <Card key={payment.id} padding="md">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-display font-semibold text-text-900">
                  Receipt #{payment.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <span className="bg-success/10 text-success border border-success/20 px-3 py-1 rounded-full text-sm font-semibold">
                {payment.currency} {payment.amount}
              </span>
            </div>
            <div className="space-y-2 text-sm text-text-600">
              <div className="flex justify-between">
                <span>Program:</span>
                <span className="text-text-900 font-medium">{app.program_name}</span>
              </div>
              <div className="flex justify-between">
                <span>University:</span>
                <span className="text-text-900 font-medium">{app.university_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Paid on:</span>
                <span className="text-text-900 font-medium">
                  {payment.completed_at
                    ? new Date(payment.completed_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : payment.initiated_at
                      ? new Date(payment.initiated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Status:</span>
                <StatusBadge status={statusBadgeVariant(payment.status)} label={statusLabel(payment.status)} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Link href={`/dashboard/applications/${app.id}`}>
                <Button variant="ghost" size="sm" iconTrailing={<ArrowRight size={14} />}>
                  View Application
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
